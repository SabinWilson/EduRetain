const mongoose = require('mongoose');

const ModelMetaSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      unique: true,
    },
    metrics: {
      accuracy: Number,
      precision: Number,
      recall: Number,
      f1: Number,
      roc_auc: Number,
      confusion_matrix: {
        true_negative: Number,
        false_positive: Number,
        false_negative: Number,
        true_positive: Number,
        matrix: [[Number]],
      },
    },
    featureList: [String],
    featureImportances: [
      {
        feature: String,
        label: String,
        importance: Number,
      },
    ],
    trainedAt: {
      type: Date,
      default: Date.now,
    },
    totalSamples: Number,
    testSamples: Number,
    dropoutRate: Number,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ModelMeta', ModelMetaSchema);
