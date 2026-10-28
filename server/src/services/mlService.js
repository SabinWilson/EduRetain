const axios = require('axios');
const { computeFallbackRiskScore } = require('./fallbackScorer');
const { ModelMeta, SystemConfig } = require('../models');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
const ML_TIMEOUT = parseInt(process.env.ML_TIMEOUT || '3000', 10);

async function getThresholds() {
  const config = await SystemConfig.findOne({ key: 'risk_config' });
  return {
    lowMedium: config ? config.lowMediumThreshold : 0.35,
    mediumHigh: config ? config.mediumHighThreshold : 0.65,
  };
}

async function predictRisk(features) {
  const thresholds = await getThresholds();

  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, features, {
      timeout: ML_TIMEOUT,
    });

    if (response.data && response.data.success) {
      const data = response.data;
      // Re-evaluate level against institution's dynamic threshold config
      let level = 'Low';
      if (data.score >= thresholds.mediumHigh) {
        level = 'High';
      } else if (data.score >= thresholds.lowMedium) {
        level = 'Medium';
      }

      return {
        score: data.score,
        level: level,
        topFactors: data.top_factors || [],
        allFactors: data.all_factors || [],
        engine: 'ML_MODEL',
        modelVersion: data.version || 'random-forest-v1',
      };
    }
    throw new Error('ML response missing success flag');
  } catch (err) {
    console.warn(`[ML Service] Unavailable (${err.message}). Activating weighted rule-based fallback.`);
    const fallback = computeFallbackRiskScore(features, thresholds);
    return fallback;
  }
}

async function getModelMetrics() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/metrics`, {
      timeout: ML_TIMEOUT,
    });
    return {
      serviceStatus: 'online',
      data: response.data,
    };
  } catch (err) {
    console.warn(`[ML Service] Metrics fetch failed (${err.message}). Checking database cache.`);
    const cached = await ModelMeta.findOne({ isActive: true }).sort({ trainedAt: -1 });
    if (cached) {
      return {
        serviceStatus: 'offline_cached',
        data: cached,
      };
    }
    return {
      serviceStatus: 'offline',
      message: 'ML service is currently unreachable and no cached metrics exist.',
      data: null,
    };
  }
}

async function triggerModelTraining(csvPath = null) {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/train`,
      { csv_path: csvPath },
      { timeout: 120000 }
    );
    if (response.data && response.data.success) {
      const meta = response.data.metrics;
      // Upsert into ModelMeta
      await ModelMeta.updateMany({}, { isActive: false });
      await ModelMeta.create({
        version: meta.version,
        metrics: meta.metrics,
        featureList: meta.feature_list,
        featureImportances: meta.feature_importances,
        totalSamples: meta.total_samples,
        testSamples: meta.test_samples,
        dropoutRate: meta.dropout_rate,
        isActive: true,
      });
      return response.data;
    }
    throw new Error('Training response returned unsuccessful status');
  } catch (err) {
    console.error(`[ML Service] Training trigger failed: ${err.message}`);
    throw err;
  }
}

async function checkMLHealth() {
  try {
    const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
    return { online: true, ...res.data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

module.exports = {
  predictRisk,
  getModelMetrics,
  triggerModelTraining,
  checkMLHealth,
  getThresholds,
};
