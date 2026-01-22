import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { Source } from './models/Source';

dotenv.config();

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || '';
  await connectDB(MONGODB_URI).catch((e) => {
    // proceed even if DB connect logs a warning; connectDB may have thrown
    // but the function using in-memory server will have thrown earlier.
    // We'll still attempt to create and let mongoose report any errors.
    // eslint-disable-next-line no-console
  });

  const url = process.env.SAMPLE_SOURCE_URL || 'https://example.com';
  const name = process.env.SAMPLE_SOURCE_NAME || 'Example Careers';
  try {
    const s = await Source.create({ name, url, selector: 'a', enabled: true });
    // eslint-disable-next-line no-console
  } catch (err) {
    // eslint-disable-next-line no-console
    process.exit(2);
  }
  process.exit(0);
}

if (require.main === module) main();
