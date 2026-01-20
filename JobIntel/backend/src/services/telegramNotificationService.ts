import axios from 'axios';
import { logger } from '../utils/logger';
import { NotificationLog } from '../models/NotificationLog';

class TelegramNotificationService {
  private botToken: string;
  private apiUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;

    if (!this.botToken) {
      logger.warn('Telegram bot token not configured. Messages will not be sent.');
    }
  }

  /**
   * Send message via Telegram
   */
  async sendMessage(
    chatId: string,
    message: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown',
    userId?: string
  ): Promise<boolean> {
    if (!this.botToken) {
      logger.warn('Telegram not configured. Skipping message send.');
      return true;
    }

    try {
      const url = `${this.apiUrl}/sendMessage`;

      const response = await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      });

      logger.info(`Telegram message sent to ${chatId}`);

      if (userId) {
        await NotificationLog.create({
          userId,
          channel: 'telegram',
          notificationType: 'match',
          message,
          status: 'sent',
          sentAt: new Date(),
        });
      }

      return true;
    } catch (error) {
      logger.error(`Failed to send Telegram message to ${chatId}:`, error);

      if (userId) {
        await NotificationLog.create({
          userId,
          channel: 'telegram',
          notificationType: 'match',
          message,
          status: 'failed',
          failureReason: String(error),
        });
      }

      return false;
    }
  }

  /**
   * Send new match notification
   */
  async sendMatchNotification(
    chatId: string,
    jobTitle: string,
    matchScore: number,
    companyName: string,
    jobUrl: string,
    userId: string
  ): Promise<boolean> {
    const message = `
🎯 *New Job Match!*

*${matchScore}% Match* ⭐

*Job:* ${jobTitle}
*Company:* ${companyName}

[View Job](${jobUrl})
    `;

    return this.sendMessage(chatId, message, 'Markdown', userId);
  }

  /**
   * Send daily digest
   */
  async sendDailyDigest(
    chatId: string,
    matchCount: number,
    excellentCount: number,
    topJobs: string[],
    userId: string
  ): Promise<boolean> {
    const jobsList = topJobs.map(job => `• ${job}`).join('\n');

    const message = `
📊 *Daily JobIntel Digest*

*${matchCount}* new matches found! 🎉
*${excellentCount}* excellent matches ⭐⭐⭐

*Top Jobs:*
${jobsList}

[View All](https://jobintel.com/matched-jobs)
    `;

    return this.sendMessage(chatId, message, 'Markdown', userId);
  }

  /**
   * Send skill recommendation
   */
  async sendSkillRecommendation(
    chatId: string,
    missingSkills: string[],
    inDemandSkills: string[],
    userId: string
  ): Promise<boolean> {
    const missingList = missingSkills.slice(0, 5).map(skill => `\`${skill}\``).join(', ');
    const inDemandList = inDemandSkills.slice(0, 5).map(skill => `\`${skill}\``).join(', ');

    const message = `
🎯 *Upskill Recommendations*

Missing these in-demand skills:
${missingList}

Popular right now:
${inDemandList}

Level up and increase your match score! 📈
    `;

    return this.sendMessage(chatId, message, 'Markdown', userId);
  }

  /**
   * Send application reminder
   */
  async sendApplicationReminder(
    chatId: string,
    jobTitle: string,
    companyName: string,
    matchScore: number,
    expiringIn: string,
    jobUrl: string,
    userId: string
  ): Promise<boolean> {
    const message = `
⏰ *Application Reminder*

Don't miss out on this opportunity!

*${jobTitle}* @ ${companyName}
*Match:* ${matchScore}% ⭐

⏳ *Expires in:* ${expiringIn}

[Apply Now](${jobUrl})
    `;

    return this.sendMessage(chatId, message, 'Markdown', userId);
  }

  /**
   * Test Telegram connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.botToken) {
      logger.warn('Telegram bot token not configured.');
      return false;
    }

    try {
      const url = `${this.apiUrl}/getMe`;
      const response = await axios.get(url);

      logger.info('Telegram connection test successful:', response.data.result.username);
      return true;
    } catch (error) {
      logger.error('Telegram connection test failed:', error);
      return false;
    }
  }
}

export const telegramNotificationService = new TelegramNotificationService();
