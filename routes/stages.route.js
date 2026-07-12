const express = require('express');
const stagesController = require('../controllers/stages.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const stageValidators = require('../validators/stage.validators');

const router = express.Router();

router.use(requireAuth);

router
  .route('/')
  .get(stagesController.getStages)
  .post(authorize('owner'), validate(stageValidators.createStage), stagesController.createStage);

router.patch('/reorder', authorize('owner'), validate(stageValidators.reorderStages), stagesController.reorderStages);
router
  .route('/:stageId')
  .patch(authorize('owner'), validate(stageValidators.updateStage), stagesController.updateStage)
  .delete(authorize('owner'), stagesController.deleteStage);

module.exports = router;
