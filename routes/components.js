const express = require('express');
const router = express.Router();
const Component = require('../models/Component');

/**
 * GET /api/components
 * Returns all active components.
 * Query params: ?format=sections (returns grouped by category for SectionList)
 */
router.get('/', async (req, res) => {
  try {
    const { format } = req.query;
    const components = await Component.find({ isActive: true })
      .select('componentId name title category description version order updatedAt')
      .sort({ order: 1, name: 1 })
      .lean();

    if (format === 'sections') {
      const sectionMap = new Map();
      components.forEach((item) => {
        const catTitle = item.title || item.category || 'React Native Components';
        if (!sectionMap.has(catTitle)) {
          sectionMap.set(catTitle, []);
        }
        sectionMap.get(catTitle).push({
          id: item.componentId,
          name: item.name,
          description: item.description,
          version: item.version,
        });
      });

      const sections = Array.from(sectionMap.entries()).map(([title, data]) => ({
        title,
        data,
      }));

      return res.json({ success: true, count: components.length, sections });
    }

    res.json({
      success: true,
      count: components.length,
      data: components,
    });
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ success: false, message: 'Server error fetching components' });
  }
});

/**
 * GET /api/components/all/full
 * Returns all components with full componentData for offline caching sync
 */
router.get('/all/full', async (req, res) => {
  try {
    const components = await Component.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      count: components.length,
      data: components,
    });
  } catch (error) {
    console.error('Error fetching full components bundle:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/components/:id
 * Returns single component detail by componentId or name
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const component = await Component.findOne({
      $or: [{ componentId: id }, { name: new RegExp('^' + id + '$', 'i') }],
      isActive: true,
    }).lean();

    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Component not found',
      });
    }

    res.json({
      success: true,
      data: component,
    });
  } catch (error) {
    console.error('Error fetching component:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/components/sync-batch
 * Upsert components in batch
 */
router.post('/sync-batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array is required' });
    }

    const operations = items.map((item) => ({
      updateOne: {
        filter: { componentId: item.componentId },
        update: {
          $set: {
            name: item.name,
            title: item.title || '',
            category: item.category || 'General',
            description: item.description || '',
            componentData: item.componentData,
            version: item.version || 1,
            order: item.order || 0,
            isActive: item.isActive !== undefined ? item.isActive : true,
          },
        },
        upsert: true,
      },
    }));

    const result = await Component.bulkWrite(operations);
    res.json({
      success: true,
      message: 'Batch sync complete',
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error in sync-batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
