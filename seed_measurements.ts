
import { initDatabase, getDB } from './src/services/db/database';
import { addMeasurement, prepopulateDefaultConfigs } from './src/services/measurement/measurementService';
import { generateId } from './src/utils/id';

async function seed() {
  await initDatabase();
  const db = getDB();
  
  // Get first client
  const clients = await db.getAllAsync('SELECT id FROM clients LIMIT 1');
  if (clients.length === 0) {
    console.log('No clients found. Please create a client first.');
    return;
  }
  const clientId = (clients[0] as any).id;
  
  console.log(`Seeding data for client: ${clientId}`);
  
  await prepopulateDefaultConfigs(clientId);
  
  const dates = [
    '2024-04-01',
    '2024-04-05',
    '2024-04-10',
    '2024-04-15',
    '2024-04-20'
  ];
  
  for (let i = 0; i < dates.length; i++) {
    const weight = 80 - (i * 0.5); // Descending weight
    const chest = 100 + (i * 0.2);
    const pull = 60 + (i * 2);
    
    const values = {
      weight_kg: weight,
      chest_cm: chest,
      waist_cm: 85 - (i * 0.1),
      pull_strength_kg: pull,
      push_strength_kg: 50 + (i * 1.5),
      lower_body_strength_kg: 80 + (i * 3),
      cardio_endurance_min: 20 + (i * 2)
    };
    
    try {
      await addMeasurement(clientId, {
        date: dates[i],
        values: values,
        notes: `Seed entry ${i+1}`
      });
      console.log(`Log generated for ${dates[i]}`);
    } catch (e) {
      console.log(`Skipped ${dates[i]} (likely already exists)`);
    }
  }
  
  console.log('Seed complete.');
}

seed().catch(console.error);
