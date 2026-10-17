require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Component = require('../models/Component');

async function seed() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI not found in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas successfully.');

  const fileContent = fs.readFileSync('D:/RNApp/src/data/componentsData.js', 'utf8');

  const sectionRegex = /title:\s*["']([^"']+)["'][\s\S]*?data:\s*\[([\s\S]*?)\]\s*\},?/g;
  const itemRegex = /id:\s*["']([^"']+)["'][\s\S]*?name:\s*["']([^"']+)["'][\s\S]*?description:\s*["']([^"']+)["'][\s\S]*?require\(\s*['"]([^'"]+)['"]\s*\)/g;

  const operations = [];
  let sectionMatch;
  let globalOrder = 0;

  while ((sectionMatch = sectionRegex.exec(fileContent)) !== null) {
    const sectionTitle = sectionMatch[1];
    const itemsBlock = sectionMatch[2];
    const categoryName = sectionTitle.replace(/Components?/i, '').trim();

    let itemMatch;
    while ((itemMatch = itemRegex.exec(itemsBlock)) !== null) {
      globalOrder++;
      const [_, id, name, desc, relPath] = itemMatch;
      const absPath = path.resolve('D:/RNApp/src/data', relPath);

      let componentJson = {};
      if (fs.existsSync(absPath)) {
        try {
          componentJson = JSON.parse(fs.readFileSync(absPath, 'utf8'));
        } catch (e) {
          console.warn(`Could not parse JSON for ${name} at ${absPath}`, e.message);
        }
      } else {
        console.warn(`File missing for ${name}: ${absPath}`);
      }

      // Unique normalized component ID (e.g. "view", "safeareaview", "flatlist")
      const compId = (componentJson.component || name).toString().toLowerCase().replace(/[^a-z0-9]+/g, '_');

      operations.push({
        updateOne: {
          filter: { componentId: compId },
          update: {
            $set: {
              componentId: compId,
              name: name,
              title: sectionTitle,
              category: categoryName,
              description: desc || componentJson.description || '',
              componentData: componentJson,
              version: 1,
              order: globalOrder,
              isActive: true,
            },
          },
          upsert: true,
        },
      });
    }
  }

  console.log(`Preparing to upsert ${operations.length} components into MongoDB...`);
  const result = await Component.bulkWrite(operations);
  console.log('Seeding result:', {
    matched: result.matchedCount,
    modified: result.modifiedCount,
    upserted: result.upsertedCount,
  });

  const totalCount = await Component.countDocuments();
  console.log(`Total active components in MongoDB database: ${totalCount}`);

  await mongoose.disconnect();
  console.log('Seeding finished successfully. Database connection closed.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
