import mongoose from 'mongoose';
import { User } from './models/User';

const uri = "mongodb+srv://alok85820018_db_user:ObtNJAnlYgQ3GDzq@cluster0.jmhgvfj.mongodb.net/jobintel_db";

async function check() {
  try {
    await mongoose.connect(uri);
    
    const user = await User.findOne({email: 'admin@jobintel.local'});
    
    if (user) {
    } else {
      
      const allUsers = await User.find();
    }
    
    await mongoose.disconnect();
  } catch (err: any) {
  }
}

check();
