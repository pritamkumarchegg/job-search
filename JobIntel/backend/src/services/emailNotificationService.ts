import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { NotificationLog } from '../models/NotificationLog';
import { v4 as uuidv4 } from 'uuid';

interface EmailContent {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailNotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure based on environment
    if (process.env.EMAIL_SERVICE === 'gmail' || !process.env.SMTP_HOST) {
      // Use Gmail
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER || 'noreply@jobintel.com',
          pass: process.env.GMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || 'password',
        },
      });
    } else {
      // Use custom SMTP
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }

    logger.info('Email notification service initialized');
  }

  /**
   * Send new match notification
   */
  async sendMatchNotification(
    userEmail: string,
    jobTitle: string,
    matchScore: number,
    jobUrl: string,
    unsubscribeToken: string,
    userId: string
  ): Promise<boolean> {
    const html = this.getMatchEmailTemplate(jobTitle, matchScore, jobUrl, unsubscribeToken);

    try {
      await this.sendEmail({
        to: userEmail,
        subject: `🎯 New Job Match! (${matchScore}%)`,
        html,
      });

      // Log the notification
      await NotificationLog.create({
        userId,
        channel: 'email',
        notificationType: 'match',
        subject: `New Job Match: ${jobTitle}`,
        message: `${jobTitle} - ${matchScore}% match`,
        status: 'sent',
        sentAt: new Date(),
        unsubscribeToken,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send match notification:', error);
      return false;
    }
  }

  /**
   * Send weekly summary
   */
  async sendWeeklySummary(
    userEmail: string,
    userName: string,
    matchStats: any,
    topJobs: any[],
    unsubscribeToken: string,
    userId: string
  ): Promise<boolean> {
    const html = this.getWeeklySummaryTemplate(userName, matchStats, topJobs, unsubscribeToken);

    try {
      await this.sendEmail({
        to: userEmail,
        subject: `📊 Weekly JobIntel Summary - ${matchStats.newMatches || 0} new matches!`,
        html,
      });

      await NotificationLog.create({
        userId,
        channel: 'email',
        notificationType: 'summary',
        subject: 'Weekly Summary',
        message: `Weekly summary with ${matchStats.newMatches} matches`,
        status: 'sent',
        sentAt: new Date(),
        unsubscribeToken,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send weekly summary:', error);
      return false;
    }
  }

  /**
   * Send skill recommendation
   */
  async sendSkillRecommendation(
    userEmail: string,
    skillGap: any,
    recommendations: string[],
    unsubscribeToken: string,
    userId: string
  ): Promise<boolean> {
    const html = this.getSkillRecommendationTemplate(skillGap, recommendations, unsubscribeToken);

    try {
      await this.sendEmail({
        to: userEmail,
        subject: '📈 Skill Recommendations to Boost Your Match Score',
        html,
      });

      await NotificationLog.create({
        userId,
        channel: 'email',
        notificationType: 'update',
        subject: 'Skill Recommendations',
        message: `Recommended skills: ${recommendations.join(', ')}`,
        status: 'sent',
        sentAt: new Date(),
        unsubscribeToken,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send skill recommendation:', error);
      return false;
    }
  }

  /**
   * Send application reminder
   */
  async sendApplicationReminder(
    userEmail: string,
    jobTitle: string,
    companyName: string,
    jobUrl: string,
    expiringIn: string,
    unsubscribeToken: string,
    userId: string
  ): Promise<boolean> {
    const html = this.getApplicationReminderTemplate(jobTitle, companyName, jobUrl, expiringIn, unsubscribeToken);

    try {
      await this.sendEmail({
        to: userEmail,
        subject: `⏰ Don't Miss Out! Apply to ${jobTitle}`,
        html,
      });

      await NotificationLog.create({
        userId,
        channel: 'email',
        notificationType: 'reminder',
        subject: `Application Reminder: ${jobTitle}`,
        message: `Don't miss the opportunity at ${companyName}`,
        status: 'sent',
        sentAt: new Date(),
        unsubscribeToken,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send application reminder:', error);
      return false;
    }
  }

  /**
   * Send generic email
   */
  async sendEmail(content: EmailContent): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.GMAIL_USER || 'noreply@jobintel.com',
        to: content.to,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });

      logger.info(`Email sent: ${info.messageId} to ${content.to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${content.to}:`, error);
      return false;
    }
  }

  /**
   * Email templates
   */
  private getMatchEmailTemplate(jobTitle: string, matchScore: number, jobUrl: string, unsubscribeToken: string): string {
    const matchType = matchScore >= 80 ? '⭐⭐⭐ Excellent' : matchScore >= 60 ? '⭐⭐ Good' : '⭐ Okay';

    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <table cellpadding="20" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <tr>
              <td align="center">
                <h1>🎯 New Job Match Found!</h1>
              </td>
            </tr>
          </table>

          <table cellpadding="20" cellspacing="0" width="100%">
            <tr>
              <td>
                <h2>${jobTitle}</h2>
                <p><strong>Match Score: ${matchScore}%</strong></p>
                <p>${matchType}</p>

                <p>We found a great opportunity for you! This job matches your profile based on your skills, experience, and preferences.</p>

                <a href="${jobUrl}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Job Details</a>

                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

                <p style="font-size: 12px; color: #666;">
                  <a href="https://jobintel.com/unsubscribe?token=${unsubscribeToken}" style="color: #667eea; text-decoration: none;">Unsubscribe from job alerts</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private getWeeklySummaryTemplate(userName: string, matchStats: any, topJobs: any[], unsubscribeToken: string): string {
    const jobsList = topJobs.map(job => `<li>${job.title}</li>`).join('');

    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <table cellpadding="20" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <tr>
              <td align="center">
                <h1>📊 Weekly JobIntel Summary</h1>
              </td>
            </tr>
          </table>

          <table cellpadding="20" cellspacing="0" width="100%">
            <tr>
              <td>
                <p>Hi ${userName},</p>

                <h3>This Week's Highlights</h3>
                <ul>
                  <li><strong>${matchStats.newMatches || 0}</strong> new job matches found</li>
                  <li><strong>${matchStats.excellentMatches || 0}</strong> excellent matches (80%+)</li>
                  <li><strong>${matchStats.goodMatches || 0}</strong> good matches (60-80%)</li>
                </ul>

                <h3>Top 3 Jobs This Week</h3>
                <ol>${jobsList}</ol>

                <a href="https://jobintel.com/matched-jobs" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View All Matches</a>

                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

                <p style="font-size: 12px; color: #666;">
                  <a href="https://jobintel.com/unsubscribe?token=${unsubscribeToken}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private getSkillRecommendationTemplate(skillGap: any, recommendations: string[], unsubscribeToken: string): string {
    const skillsList = recommendations.map(skill => `<li>${skill}</li>`).join('');

    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <table cellpadding="20" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <tr>
              <td align="center">
                <h1>📈 Skill Recommendations</h1>
              </td>
            </tr>
          </table>

          <table cellpadding="20" cellspacing="0" width="100%">
            <tr>
              <td>
                <p>To boost your job match score, consider learning these in-demand skills:</p>

                <h3>Recommended Skills</h3>
                <ol>${skillsList}</ol>

                <p>Learning these skills will help you match more jobs and increase your opportunities!</p>

                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

                <p style="font-size: 12px; color: #666;">
                  <a href="https://jobintel.com/unsubscribe?token=${unsubscribeToken}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private getApplicationReminderTemplate(jobTitle: string, companyName: string, jobUrl: string, expiringIn: string, unsubscribeToken: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <table cellpadding="20" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
            <tr>
              <td align="center">
                <h1>⏰ Don't Miss Out!</h1>
              </td>
            </tr>
          </table>

          <table cellpadding="20" cellspacing="0" width="100%">
            <tr>
              <td>
                <h2>${jobTitle}</h2>
                <p><strong>Company:</strong> ${companyName}</p>

                <p style="color: #f5576c; font-weight: bold;">Applications closing in ${expiringIn}</p>

                <p>This is a great match for your profile. Don't let this opportunity pass!</p>

                <a href="${jobUrl}" style="display: inline-block; background-color: #f5576c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Apply Now</a>

                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

                <p style="font-size: 12px; color: #666;">
                  <a href="https://jobintel.com/unsubscribe?token=${unsubscribeToken}" style="color: #f5576c; text-decoration: none;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }
}

export const emailNotificationService = new EmailNotificationService();
