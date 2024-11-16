export const saveModelLocally = async (modelName, model) => {
  try {
    // Extract tree structure and label encoder from the model
    const modelData = {
      tree: {
        feature: model.feature,
        threshold: model.threshold,
        left: model.left,
        right: model.right,
        value: model.value
      },
      labelEncoder: model.labelEncoder || {
        'sunny': 0,
        'rainy': 1,
        'cloudy': 2,
        'stormy': 3
      }
    };

    // Send to API
    const response = await fetch('/api/saveModel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelName,
        modelData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save model file');
    }

    const result = await response.json();
    
    // Store in localStorage for immediate use
    localStorage.setItem('aggregatedModel', JSON.stringify({
      model: { tree: modelData.tree },
      labelEncoder: { condition: modelData.labelEncoder }
    }));

    console.log(`Model saved successfully at ${result.path}`);
    return result.path;

  } catch (error) {
    console.error('Error saving model locally:', error);
    throw new Error('Failed to save model file');
  }
}; 