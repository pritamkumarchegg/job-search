import axios from 'axios';
import { logger } from '../utils/logger';
import { NotificationLog } from '../models/NotificationLog';

class WhatsAppNotificationService {
  private apiKey: string;
  private phoneId: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.WHATSAPP_API_KEY || '';
    this.phoneId = process.env.WHATSAPP_PHONE_ID || '';
    this.apiUrl = 'https://graph.instagram.com/v18.0';

    if (!this.apiKey || !this.phoneId) {
      logger.warn('WhatsApp credentials not configured. Messages will not be sent.');
    }
  }

  /**
   * Send message via WhatsApp
   */
  async sendMessage(
    toPhoneNumber: string,
    message: string,
    messageType: 'text' | 'template' = 'text',
    userId?: string
  ): Promise<boolean> {
    if (!this.apiKey || !this.phoneId) {
      logger.warn('WhatsApp not configured. Skipping message send.');
      return true; // Don't fail, just skip
    }

    try {
      const url = `${this.apiUrl}/${this.phoneId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: toPhoneNumber.replace(/[+\-\s]/g, ''),
        type: messageType,
        [messageType === 'text' ? 'text' : 'template']: {
          body: message,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`WhatsApp message sent to ${toPhoneNumber}`);

      if (userId) {
        await NotificationLog.create({
          userId,
          channel: 'whatsapp',
          notificationType: 'match',
          message,
          status: 'sent',
          sentAt: new Date(),
        });
      }

      return true;
    } catch (error) {
      logger.error(`Failed to send WhatsApp message to ${toPhoneNumber}:`, error);

      if (userId) {
        await NotificationLog.create({
          userId,
          channel: 'whatsapp',
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
   * Send new match notification via WhatsApp
   */
  async sendMatchNotification(
    phoneNumber: string,
    jobTitle: string,
    matchScore: number,
    jobUrl: string,
    userId: string
  ): Promise<boolean> {
    const message = `🎯 *New Job Match!* 🎯\n\nWe found a ${matchScore}% match for you!\n\n*${jobTitle}*\n\nCheck it out: ${jobUrl}`;
    return this.sendMessage(phoneNumber, message, 'text', userId);
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(
    phoneNumber: string,
    matchCount: number,
    topJobTitle: string,
    userId: string
  ): Promise<boolean> {
    const message = `📊 *Daily JobIntel Summary*\n\n${matchCount} new matches found!\n\nTop job: ${topJobTitle}`;
    return this.sendMessage(phoneNumber, message, 'text', userId);
  }

  /**
   * Send application reminder
   */
  async sendApplicationReminder(
    phoneNumber: string,
    jobTitle: string,
    companyName: string,
    expiringIn: string,
    userId: string
  ): Promise<boolean> {
    const message = `⏰ *Don't Miss Out!*\n\n${jobTitle}\n\nCompany: ${companyName}\n\nExpires in ${expiringIn}`;
    return this.sendMessage(phoneNumber, message, 'text', userId);
  }

  /**
   * Send skill recommendation
   */
  async sendSkillRecommendation(
    phoneNumber: string,
    skills: string[],
    userId: string
  ): Promise<boolean> {
    const skillsList = skills.slice(0, 5).join(', ');
    const message = `📈 *Boost Your Match Score!*\n\nTry learning these skills:\n${skillsList}`;
    return this.sendMessage(phoneNumber, message, 'text', userId);
  }

  /**
   * Test WhatsApp connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey || !this.phoneId) {
      logger.warn('WhatsApp credentials not configured.');
      return false;
    }

    try {
      const url = `${this.apiUrl}/${this.phoneId}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      logger.info('WhatsApp connection test successful');
      return true;
    } catch (error) {
      logger.error('WhatsApp connection test failed:', error);
      return false;
    }
  }
}

export const whatsappNotificationService = new WhatsAppNotificationService();
