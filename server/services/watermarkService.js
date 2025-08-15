/**
 * FlickMV Watermark Service
 * - Manages watermark settings based on user subscription plan
 * - Applies watermarks during video export
 * - Handles different watermark styles and positions
 */

const PLAN_FEATURES = {
  free: {
    canRemoveWatermark: false,
    maxOutputResolution: '720p',
    maxExportsPerMonth: 5
  },
  basic: {
    canRemoveWatermark: false,
    maxOutputResolution: '1080p',
    maxExportsPerMonth: 25
  },
  pro: {
    canRemoveWatermark: true,
    maxOutputResolution: '4K',
    maxExportsPerMonth: 100
  },
  premium: {
    canRemoveWatermark: true,
    maxOutputResolution: '4K',
    maxExportsPerMonth: -1 // unlimited
  }
};

const WATERMARK_PRESETS = {
  minimal: {
    position: { x: 85, y: 10 },
    size: 12,
    opacity: 60,
    style: 'minimal'
  },
  branded: {
    position: { x: 50, y: 50 },
    size: 25,
    opacity: 30,
    style: 'branded'
  },
  corner: {
    position: { x: 90, y: 90 },
    size: 15,
    opacity: 70,
    style: 'corner'
  },
  center: {
    position: { x: 50, y: 85 },
    size: 18,
    opacity: 50,
    style: 'center'
  }
};

class WatermarkService {
  /**
   * Check if user can remove watermark based on their plan
   */
  static canRemoveWatermark(userPlan) {
    return PLAN_FEATURES[userPlan]?.canRemoveWatermark || false;
  }

  /**
   * Get default watermark settings for user
   */
  static getDefaultWatermarkSettings(userPlan) {
    const canRemove = this.canRemoveWatermark(userPlan);
    
    return {
      enabled: !canRemove, // Force watermark for free/basic plans
      preset: 'minimal',
      settings: WATERMARK_PRESETS.minimal
    };
  }

  /**
   * Validate watermark settings based on user plan
   */
  static validateWatermarkSettings(userPlan, watermarkSettings) {
    const canRemove = this.canRemoveWatermark(userPlan);
    
    // Force watermark for free/basic plans
    if (!canRemove) {
      return {
        ...watermarkSettings,
        enabled: true
      };
    }
    
    return watermarkSettings;
  }

  /**
   * Generate FFmpeg filter for watermark overlay
   */
  static generateWatermarkFilter(watermarkSettings, videoWidth, videoHeight) {
    if (!watermarkSettings.enabled) {
      return null;
    }

    const preset = WATERMARK_PRESETS[watermarkSettings.preset] || WATERMARK_PRESETS.minimal;
    
    // Calculate absolute position from percentage
    const x = Math.round((preset.position.x / 100) * videoWidth);
    const y = Math.round((preset.position.y / 100) * videoHeight);
    
    // Calculate font size based on video resolution
    const fontSize = Math.round((preset.size / 720) * videoHeight * 0.05);
    
    // Generate text overlay filter
    const textFilter = `drawtext=text='FlickMV':fontcolor=white:fontsize=${fontSize}:x=${x}:y=${y}:alpha=${preset.opacity / 100}`;
    
    // Add style-specific modifications
    switch (preset.style) {
      case 'minimal':
        return `${textFilter}:shadowcolor=black:shadowx=1:shadowy=1`;
      case 'branded':
        return `${textFilter}:fontcolor=0x6366f1:borderw=1:bordercolor=white`;
      case 'corner':
        return `${textFilter}:box=1:boxcolor=black@0.6:boxborderw=5`;
      case 'center':
        return `${textFilter}:box=1:boxcolor=black@0.4:boxborderw=10:borderw=1:bordercolor=white@0.3`;
      default:
        return textFilter;
    }
  }

  /**
   * Apply watermark to export job metadata
   */
  static applyWatermarkToExport(exportJob, userPlan) {
    const watermarkSettings = this.validateWatermarkSettings(
      userPlan, 
      exportJob.watermarkSettings || this.getDefaultWatermarkSettings(userPlan)
    );

    return {
      ...exportJob,
      watermarkSettings,
      metadata: {
        ...exportJob.metadata,
        watermark: {
          applied: watermarkSettings.enabled,
          preset: watermarkSettings.preset,
          timestamp: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Get user plan features
   */
  static getPlanFeatures(userPlan) {
    return PLAN_FEATURES[userPlan] || PLAN_FEATURES.free;
  }

  /**
   * Check if user has reached export limit
   */
  static async checkExportLimit(userId, userPlan) {
    const features = this.getPlanFeatures(userPlan);
    
    if (features.maxExportsPerMonth === -1) {
      return { canExport: true, remaining: -1 };
    }

    // This would typically query the database for user's export count this month
    // For now, return a mock response
    const currentExports = 0; // TODO: Get from database
    const remaining = features.maxExportsPerMonth - currentExports;
    
    return {
      canExport: remaining > 0,
      remaining: Math.max(0, remaining),
      limit: features.maxExportsPerMonth
    };
  }
}

module.exports = WatermarkService;