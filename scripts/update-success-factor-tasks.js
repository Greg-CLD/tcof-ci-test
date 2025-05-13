/**
 * Script to update success factor tasks with new authoritative data
 * 
 * This script will:
 * 1. Purge all existing tasks
 * 2. Insert new tasks from the provided JSON data
 * 3. Verify the count and stages match the expected values
 */

import pkg from 'pg';
import { v4 as uuidv4 } from 'uuid';
const { Client } = pkg;

// The new task data provided
const newTasks = [
  {
    "stage": "Stage 1",
    "factorId": 1.1,
    "successFactor": "Ask Why",
    "task": "Talk to 3 to 5 key stakeholders"
  },
  {
    "stage": "Stage 1",
    "factorId": 1.1,
    "successFactor": "Ask Why",
    "task": "Ask what frustrates them and what a win looks like"
  },
  {
    "stage": "Stage 1",
    "factorId": 1.1,
    "successFactor": "Ask Why",
    "task": "Probe beyond technical requirements to uncover unstated needs"
  },
  {
    "stage": "Stage 1",
    "factorId": 1.1,
    "successFactor": "Ask Why",
    "task": "Ask 'why' at least five times to reach root motivations"
  },
  {
    "stage": "Stage 1",
    "factorId": 1.1,
    "successFactor": "Ask Why",
    "task": "Set expectations for iterative discovery"
  },
  {
    "stage": "Stage 1",
    "factorId": 1.1,
    "successFactor": "Ask Why",
    "task": "Capture "why" answers for later reference"
  },
  {
    "stage": "Stage 1",
    "factorId": 2.1,
    "successFactor": "Recognise that your project is not unique",
    "task": "Identify similar past projects internally"
  },
  {
    "stage": "Stage 1",
    "factorId": 2.1,
    "successFactor": "Recognise that your project is not unique",
    "task": "Research industry case studies for similar initiatives"
  },
  {
    "stage": "Stage 1",
    "factorId": 2.1,
    "successFactor": "Recognise that your project is not unique",
    "task": "Document lessons learned from analogous efforts"
  },
  {
    "stage": "Stage 1",
    "factorId": 2.1,
    "successFactor": "Recognise that your project is not unique",
    "task": "Validate your assumptions against known patterns"
  },
  {
    "stage": "Stage 1",
    "factorId": 2.2,
    "successFactor": "Look for Tried & Tested Options",
    "task": "Catalogue existing solutions within your organisation"
  },
  {
    "stage": "Stage 1",
    "factorId": 2.2,
    "successFactor": "Look for Tried & Tested Options",
    "task": "Evaluate open source or commercial off-the-shelf tools"
  },
  {
    "stage": "Stage 1",
    "factorId": 2.2,
    "successFactor": "Look for Tried & Tested Options",
    "task": "Assess support and maintenance overheads"
  },
  {
    "stage": "Stage 1",
    "factorId": 2.2,
    "successFactor": "Look for Tried & Tested Options",
    "task": "Pilot a small proof of concept with shortlisted options"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.1,
    "successFactor": "Think Big, Start Small",
    "task": "Define the broad end-state vision"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.1,
    "successFactor": "Think Big, Start Small",
    "task": "Break the vision into minimal viable increments"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.1,
    "successFactor": "Think Big, Start Small",
    "task": "Prioritise the first increment for fastest feedback"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.1,
    "successFactor": "Think Big, Start Small",
    "task": "Validate the increment before scaling"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.2,
    "successFactor": "Learn by Experimenting",
    "task": "Design experiments to test key assumptions"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.2,
    "successFactor": "Learn by Experimenting",
    "task": "Capture metrics to measure outcomes"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.2,
    "successFactor": "Learn by Experimenting",
    "task": "Iterate based on experimental results"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.2,
    "successFactor": "Learn by Experimenting",
    "task": "Document failures as well as successes"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.3,
    "successFactor": "Keep on top of risks",
    "task": "Maintain a risk register updated weekly"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.3,
    "successFactor": "Keep on top of risks",
    "task": "Assign owners and mitigation steps"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.3,
    "successFactor": "Keep on top of risks",
    "task": "Review risk status at each stand-up"
  },
  {
    "stage": "Stage 1",
    "factorId": 3.3,
    "successFactor": "Keep on top of risks",
    "task": "Alert stakeholders on critical changes"
  },
  {
    "stage": "Stage 1",
    "factorId": 4.1,
    "successFactor": "Adjust for optimism",
    "task": "Apply a 30% delivery buffer in estimates"
  },
  {
    "stage": "Stage 1",
    "factorId": 4.1,
    "successFactor": "Adjust for optimism",
    "task": "Validate estimates against historical data"
  },
  {
    "stage": "Stage 1",
    "factorId": 4.1,
    "successFactor": "Adjust for optimism",
    "task": "Engage the team to calibrate effort"
  },
  {
    "stage": "Stage 1",
    "factorId": 4.1,
    "successFactor": "Adjust for optimism",
    "task": "Use relative sizing for complex tasks"
  },
  {
    "stage": "Stage 1",
    "factorId": 4.3,
    "successFactor": "Be Ready to Adapt",
    "task": "Plan for iterative scope changes"
  },
  {
    "stage": "Stage 1",
    "factorId": 4.3,
    "successFactor": "Be Ready to Adapt",
    "task": "Design flexible architectures"
  },
  {
    "stage": "Stage 1",
    "factorId": 4.3,
    "successFactor": "Be Ready to Adapt",
    "task": "Implement feature toggles"
  },
  {
    "stage": "Stage 1",
    "factorId": 4.3,
    "successFactor": "Be Ready to Adapt",
    "task": "Set up regular meetings with key people to adapt to a changing world"
  },
  {
    "stage": "Stage 2",
    "factorId": 4.3,
    "successFactor": "Be Ready to Adapt",
    "task": "Adapt the requirements / plan / scope based as new information comes to light."
  },
  {
    "stage": "Stage 3",
    "factorId": 4.3,
    "successFactor": "Be Ready to Adapt",
    "task": "Adapt the requirements / plan / scope based as new information comes to light."
  }
];

// Map of factor IDs to database IDs
const factorIdMap = {
  1.1: 'sf-1',
  1.2: 'sf-2',
  1.3: 'sf-3',
  1.4: 'sf-4',
  2.1: 'sf-5',
  2.2: 'sf-6',
  3.1: 'sf-7',
  3.2: 'sf-8',
  3.3: 'sf-9',
  4.1: 'sf-10',
  4.2: 'sf-11',
  4.3: 'sf-12'
};

// Stage mapping from "Stage X" format to our database enum
const stageMap = {
  'Stage 1': 'Identification',
  'Stage 2': 'Definition',
  'Stage 3': 'Delivery',
  'Stage 4': 'Closure'
};

async function updateSuccessFactorTasks() {
  // Create a database client
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');

    // Step 2: Purge all existing tasks
    console.log('Deleting all existing tasks...');
    const deleteResult = await client.query('DELETE FROM success_factor_tasks');
    console.log(`Deleted ${deleteResult.rowCount} existing tasks`);

    // Step 3: Insert new tasks
    console.log('Inserting new tasks...');
    let insertedCount = 0;

    // Group tasks by factor and stage for ordering
    const groupedTasks = {};
    newTasks.forEach(task => {
      const factorId = factorIdMap[task.factorId];
      const stage = stageMap[task.stage];

      if (!factorId) {
        console.error(`Unknown factor ID: ${task.factorId}`);
        return;
      }

      if (!stage) {
        console.error(`Unknown stage: ${task.stage}`);
        return;
      }

      if (!groupedTasks[factorId]) {
        groupedTasks[factorId] = {};
      }
      
      if (!groupedTasks[factorId][stage]) {
        groupedTasks[factorId][stage] = [];
      }

      groupedTasks[factorId][stage].push(task.task);
    });

    // Insert tasks with proper ordering
    for (const factorId of Object.keys(groupedTasks)) {
      for (const stage of Object.keys(groupedTasks[factorId])) {
        const tasks = groupedTasks[factorId][stage];
        
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          const order = i;
          
          await client.query(
            'INSERT INTO success_factor_tasks (id, factor_id, stage, text, "order") VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), factorId, stage, task, order]
          );
          
          insertedCount++;
        }
      }
    }

    console.log(`Inserted ${insertedCount} new tasks`);

    // Step 4: Verify count and stages
    const countResult = await client.query('SELECT COUNT(*) FROM success_factor_tasks');
    console.log(`Total tasks in database: ${countResult.rows[0].count}`);

    const stagesResult = await client.query('SELECT DISTINCT stage FROM success_factor_tasks ORDER BY stage');
    console.log('Available stages:');
    stagesResult.rows.forEach(row => {
      console.log(`- ${row.stage}`);
    });

    // Get a sample row for sf-1 in "Identification" stage
    const sampleResult = await client.query(
      'SELECT * FROM success_factor_tasks WHERE factor_id = $1 AND stage = $2 ORDER BY "order" LIMIT 1',
      ['sf-1', 'Identification']
    );

    if (sampleResult.rows.length > 0) {
      console.log('\nSample row for sf-1 in "Identification" stage:');
      console.log(sampleResult.rows[0]);
    } else {
      console.log('\nNo sample row found for sf-1 in "Identification" stage');
    }

    console.log('\nUpdate completed successfully!');
  } catch (error) {
    console.error('Error updating success factor tasks:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Disconnected from database');
  }
}

// Run the update function
updateSuccessFactorTasks();