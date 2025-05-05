import { db } from './index';
import { outcomes, outcomeProgress } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding database...');
  
  try {
    // First check if outcomes already exist to avoid duplicates
    const existingOutcomes = await db.select().from(outcomes);
    
    if (existingOutcomes.length > 0) {
      console.log(`Found ${existingOutcomes.length} existing outcomes. Skipping outcome seed.`);
    } else {
      // Default goal map outcomes
      const defaultOutcomes = [
        {
          id: uuidv4(),
          title: 'User Adoption',
          description: 'Measure how many users adopt and actively use the product or service',
          level: 'level1',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          title: 'Cost Reduction',
          description: 'Decrease operational costs and improve efficiency',
          level: 'level1',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          title: 'Increased Revenue',
          description: 'Generate additional revenue through new or improved offerings',
          level: 'level1',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          title: 'Process Improvement',
          description: 'Enhance existing processes to make them more efficient or effective',
          level: 'level2',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          title: 'Customer Satisfaction',
          description: 'Improve overall customer experience and satisfaction metrics',
          level: 'level2',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          title: 'Product Quality',
          description: 'Enhance the quality and reliability of products or services',
          level: 'level2',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          title: 'Regulatory Compliance',
          description: 'Ensure adherence to relevant laws, regulations, and standards',
          level: 'level3',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          title: 'Innovation Capability',
          description: 'Improve the organization\'s ability to innovate and adapt',
          level: 'level3',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          title: 'Time to Market',
          description: 'Reduce the time required to introduce new products or features',
          level: 'level3',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          title: 'Strategic Alignment',
          description: 'Ensure initiatives align with the organization\'s strategic goals',
          level: 'level4',
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Insert default outcomes
      const insertedOutcomes = await db.insert(outcomes).values(defaultOutcomes).returning();
      console.log(`Inserted ${insertedOutcomes.length} default outcomes.`);
    }
    
    console.log('✅ Seed completed successfully.');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seed().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unhandled error during seeding:', error);
  process.exit(1);
});