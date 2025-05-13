import { db } from './db';
import { sql } from 'drizzle-orm';
import type { FactorTask } from '../scripts/factorUtils';

export async function getFactors(): Promise<FactorTask[]> {
  try {
    const result = await db.execute(sql`
      SELECT f.id, f.title, f.description,
             ft.stage, ft.task_text
      FROM success_factors f
      LEFT JOIN success_factor_tasks ft ON f.id = ft.factor_id
      ORDER BY f.id, ft.stage
    `);

    if (!result.rows || result.rows.length === 0) {
      return [];
    }

    // Group tasks by factor and stage
    const factorMap = new Map<string, FactorTask>();

    result.rows.forEach((row: any) => {
      if (!factorMap.has(row.id)) {
        factorMap.set(row.id, {
          id: row.id,
          title: row.title,
          tasks: {
            Identification: [],
            Definition: [],
            Delivery: [],
            Closure: []
          }
        });
      }

      const factor = factorMap.get(row.id)!;
      if (row.stage && row.task_text) {
        factor.tasks[row.stage as keyof typeof factor.tasks].push(row.task_text);
      }
    });

    return Array.from(factorMap.values());
  } catch (error) {
    console.error('Error loading factors from database:', error);
    throw error;
  }
}

export async function getFactor(id: string): Promise<FactorTask | null> {
  try {
    const result = await db.execute(sql`
      SELECT f.id, f.title, f.description,
             ft.stage, ft.task_text
      FROM success_factors f
      LEFT JOIN success_factor_tasks ft ON f.id = ft.factor_id
      WHERE f.id = ${id}
      ORDER BY ft.stage
    `);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const factor: FactorTask = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      tasks: {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      }
    };

    result.rows.forEach((row: any) => {
      if (row.stage && row.task_text) {
        factor.tasks[row.stage as keyof typeof factor.tasks].push(row.task_text);
      }
    });

    return factor;
  } catch (error) {
    console.error(`Error loading factor ${id} from database:`, error);
    throw error;
  }
}