export const saveModelLocally = async (modelName, model) => {
  try {
    // Get model data
    const modelData = model.toJSON();

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
    console.log(`Model saved successfully at ${result.path}`);
    return result.path;

  } catch (error) {
    console.error('Error saving model locally:', error);
    throw new Error('Failed to save model file');
  }
}; 