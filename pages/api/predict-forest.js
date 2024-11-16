import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function predictWithTree(tree, input) {
  if (!tree.feature) {
    return tree.value;
  }
  const featureValue = input[tree.feature];
  if (featureValue <= tree.threshold) {
    return predictWithTree(tree.left, input);
  } else {
    return predictWithTree(tree.right, input);
  }
}

async function extractWeatherParameters(userInput) {
  // Regex pattern for "Today is x degree celcuis with y % humidity in z"
  const pattern = /Today is (\d+(?:\.\d+)?) degree celcuis with (\d+(?:\.\d+)?)% humidity in (\w+)/i;
  
  const monthMap = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
  };

  const match = userInput.match(pattern);
  if (!match) {
    throw new Error('Invalid input format. Please use: "Today is X degree celcuis with Y% humidity in Z"');
  }

  const temperature = parseFloat(match[1]);
  const humidity = parseFloat(match[2]);
  const monthStr = match[3].toLowerCase();
  const month = monthMap[monthStr];

  if (!month) {
    throw new Error('Invalid month format');
  }

  // Get feature ranges from model files
  const featureRanges = {
    temperature: { min: 5.1, max: 22.5 },  // From WM_20241114T201855.json
    humidity: { min: 40, max: 86 },        // From WM_20241114T201714.json
    month: { min: 1, max: 4 }              // Common across models
  };

  // Clamp values to valid ranges
  return {
    temperature: Math.min(Math.max(temperature, featureRanges.temperature.min), featureRanges.temperature.max),
    humidity: Math.min(Math.max(humidity, featureRanges.humidity.min), featureRanges.humidity.max),
    month: Math.min(Math.max(month, featureRanges.month.min), featureRanges.month.max)
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { input, naturalLanguageInput } = req.body;

    // Get input parameters
    let weatherParams = input;
    if (naturalLanguageInput) {
      weatherParams = await extractWeatherParameters(naturalLanguageInput);
    }

    // Load models
    const modelsDir = path.join(process.cwd(), 'public', 'models');
    const modelFiles = await fs.promises.readdir(modelsDir);
    const treeFiles = modelFiles.filter(file => file.startsWith('WM_'));

    // Read and parse models
    const models = await Promise.all(
      treeFiles.map(async (filename) => {
        const data = await fs.promises.readFile(path.join(modelsDir, filename), 'utf8');
        return JSON.parse(data);
      })
    );

    // Make predictions with each tree
    const predictions = await Promise.all(
      models.map(async (model) => {
        const value = await predictWithTree(model.model.tree, weatherParams);
        // Find label from value using labelEncoder
        const labels = model.labelEncoder.condition;
        return Object.keys(labels).find(key => labels[key] === value);
      })
    );

    // Calculate majority vote
    const labelCounts = predictions.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    const finalPrediction = Object.entries(labelCounts)
      .reduce((a, b) => (b[1] > a[1] ? b : a))[0];

    const confidence = (labelCounts[finalPrediction] / predictions.length) * 100;

    res.status(200).json({
      prediction: finalPrediction,
      confidence: confidence.toFixed(1),
      parameters: weatherParams,
      details: {
        totalTrees: predictions.length,
        voteCounts: labelCounts,
        predictions: predictions
      }
    });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      message: 'Prediction failed',
      error: error.message
    });
  }
} 