// import { writeFile, mkdir } from 'fs/promises';
// import { join } from 'path';

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ message: 'Method not allowed' });
//   }

//   try {
//     const { modelName, modelData } = req.body;
    
//     // Create models directory if it doesn't exist
//     const modelsDir = join(process.cwd(), 'public', 'models');
//     try {
//       await mkdir(modelsDir, { recursive: true });
//     } catch (err) {
//       if (err.code !== 'EEXIST') throw err;
//     }

//     // Create the file path
//     const filePath = join(modelsDir, `${modelName}.json`);

//     // Write the file
//     await writeFile(filePath, JSON.stringify(modelData, null, 2));

//     console.log(`Model saved successfully to ${filePath}`);
//     return res.status(200).json({ 
//       message: 'Model saved successfully',
//       path: `/models/${modelName}.json`
//     });

//   } catch (error) {
//     console.error('Error saving model:', error);
//     return res.status(500).json({ 
//       message: 'Error saving model', 
//       error: error.message 
//     });
//   }
// } 