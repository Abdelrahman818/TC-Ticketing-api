const express = require('express');
const multer = require('multer');
const ticketsController = require('../controllers/tickets.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const ticketValidators = require('../validators/ticket.validators');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

const router = express.Router();

router.use(requireAuth);

router
  .route('/')
  .get(validate(ticketValidators.listTickets, 'query'), ticketsController.getTickets)
  .post(validate(ticketValidators.createTicket), ticketsController.createTicket);

router
  .route('/:ticketId')
  .get(ticketsController.getTicketById)
  .patch(validate(ticketValidators.updateTicket), ticketsController.updateTicket)
  .delete(authorize('owner'), ticketsController.deleteTicket);

router.patch('/:ticketId/status', validate(ticketValidators.changeStatus), ticketsController.changeTicketStatus);
router.patch(
  '/:ticketId/assign',
  authorize('supervisor', 'manager', 'owner'),
  validate(ticketValidators.assignTicket),
  ticketsController.assignTicket
);
router
  .route('/:ticketId/comments')
  .get(ticketsController.getTicketComments)
  .post(validate(ticketValidators.createComment), ticketsController.addTicketComment);

router.patch('/:ticketId/archive', authorize('manager', 'owner'), ticketsController.archiveTicket);

router.get('/:ticketId/photos', ticketsController.getTicketPhotos);
router.post('/:ticketId/photos', upload.single('photo'), ticketsController.uploadTicketPhoto);
router.delete('/:ticketId/photos/:photoId', ticketsController.deleteTicketPhoto);

module.exports = router;
