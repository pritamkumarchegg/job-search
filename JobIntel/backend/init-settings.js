const mongoose = require('mongoose');
const AdminSettings = require('./dist/models/AdminSettings').AdminSettings;

async function initializeSettings() {
  try {
    await mongoose.connect('mongodb+srv://alok85820018_db_user:ObtNJAnlYgQ3GDzq@cluster0.jmhgvfj.mongodb.net/jobintel?appName=Cluster0');
    
    const defaults = [
      { key: 'ai_minimum_score', value: 70, type: 'number', description: 'Minimum match score percentage for AI-matched jobs (0-100)' },
      { key: 'ai_max_jobs_per_page', value: 50, type: 'number', description: 'Maximum number of jobs to display per page' },
      { key: 'email_notifications_enabled', value: true, type: 'boolean', description: 'Enable email notifications for users' }
    ];
    
    for (const d of defaults) {
      const exists = await AdminSettings.findOne({ key: d.key });
      if (!exists) {
        await AdminSettings.create(d);
        console.log('Created:', d.key, '=', d.value);
      } else {
        console.log('Already exists:', d.key);
      }
    }
    
    console.log('Settings initialized!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

initializeSettings();
