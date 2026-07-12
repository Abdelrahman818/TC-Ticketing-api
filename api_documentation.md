# Internal Ticketing System API Documentation

## 1. Overview

This API manages the internal tasks of a company through a ticketing system. Tickets can be created, assigned to employees, assigned to departments, moved between workflow stages, commented on, tracked, and reported.

The system has four roles:

1. Employee
2. Supervisor
3. Manager
4. Owner

Each role has different access rules. The API must always filter data based on the authenticated user's role and department/team scope.

## 2. Base URL

Local development:

```http
http://localhost:<PORT>/api
```

Recommended production version:

```http
https://api.company.com/api/v1
```

## 3. Authentication

All private endpoints require a bearer token.

```http
Authorization: Bearer <access_token>
```

Recommended token payload:

```json
{
  "userId": "64f000000000000000000001",
  "name": "Ahmed Ali",
  "email": "ahmed@company.com",
  "role": "employee",
  "departmentId": "64f000000000000000000101",
  "supervisorId": "64f000000000000000000201"
}
```

## 4. Roles And Permissions

### 4.1 Employee

Employee can:

- View tickets assigned directly to them.
- View tickets assigned to their department.
- Create tickets.
- Add comments to tickets they can access.
- Update limited fields on tickets they can access.
- View their own performance summary.

Employee cannot:

- View tickets from other departments.
- View team dashboards.
- View supervisor or manager performance.
- Edit workflow stages.
- Edit user roles.
- Manage users.

### 4.2 Supervisor

Supervisor can do everything an employee can, plus:

- View tickets assigned to employees in their team.
- View team dashboard.
- View team performance.
- View employee workload in their team.
- Assign or reassign tickets inside their team or department.
- Update priority, assignee, department, and status for accessible tickets.

Supervisor cannot:

- View all company tickets.
- View performance of other supervisors unless allowed by a manager/owner.
- Edit workflow stages.
- Edit user roles.
- Manage managers or owners.

### 4.3 Manager

Manager can:

- View all tickets across all departments.
- View department dashboards.
- View team performance like supervisors.
- View supervisor performance.
- View employee workload across departments.
- Assign or reassign tickets across departments.
- Update ticket priority, assignee, department, and status.
- Export reports.

Manager cannot:

- Edit workflow stages unless owner allows it.
- Edit user roles unless owner allows it.
- Manage owner accounts.
- Change global system configuration.

### 4.4 Owner

Owner has full control.

Owner can:

- View every ticket.
- View every employee, supervisor, and manager.
- View all dashboards and reports.
- Edit any ticket.
- Archive or delete tickets.
- Add, edit, reorder, activate, deactivate, or delete stages.
- Edit user roles.
- Assign any user to any role.
- Manage departments.
- Manage users.
- View audit logs.
- Configure system settings.

## 5. Permission Matrix

| Feature | Employee | Supervisor | Manager | Owner |
| --- | --- | --- | --- | --- |
| View own assigned tickets | Yes | Yes | Yes | Yes |
| View department tickets | Yes | Yes | Yes | Yes |
| View team tickets | No | Yes | Yes | Yes |
| View all company tickets | No | No | Yes | Yes |
| Create ticket | Yes | Yes | Yes | Yes |
| Update accessible ticket | Limited | Yes | Yes | Yes |
| Assign ticket | No | Team only | All departments | All departments |
| View personal performance | Yes | Yes | Yes | Yes |
| View team performance | No | Own team | All teams | All teams |
| View supervisor performance | No | No | Yes | Yes |
| View manager performance | No | No | No | Yes |
| Manage stages | No | No | No | Yes |
| Manage roles | No | No | No | Yes |
| Manage users | No | No | Limited | Yes |
| View audit logs | No | No | Limited | Yes |

## 6. Main Data Models

### 6.1 User

```json
{
  "_id": "64f000000000000000000001",
  "name": "Ahmed Ali",
  "email": "ahmed@company.com",
  "passwordHash": "<hashed_password>",
  "role": "employee",
  "departmentId": "64f000000000000000000101",
  "supervisorId": "64f000000000000000000201",
  "isActive": true,
  "createdAt": "2026-07-05T10:00:00.000Z",
  "updatedAt": "2026-07-05T10:00:00.000Z"
}
```

Allowed roles:

```json
["employee", "supervisor", "manager", "owner"]
```

### 6.2 Department

```json
{
  "_id": "64f000000000000000000101",
  "name": "IT",
  "description": "Internal technical support department",
  "managerId": "64f000000000000000000301",
  "isActive": true,
  "createdAt": "2026-07-05T10:00:00.000Z",
  "updatedAt": "2026-07-05T10:00:00.000Z"
}
```

### 6.3 Ticket

```json
{
  "_id": "64f000000000000000000401",
  "ticketNumber": 1001,
  "title": "Laptop keyboard not working",
  "description": "The employee laptop keyboard stopped responding.",
  "creatorId": "64f000000000000000000001",
  "assignedUserId": "64f000000000000000000002",
  "assignedDepartmentId": "64f000000000000000000101",
  "statusId": "64f000000000000000000501",
  "priority": "medium",
  "type": "support",
  "dueDate": "2026-07-10T10:00:00.000Z",
  "tags": ["hardware", "laptop"],
  "isArchived": false,
  "history": [
    {
      "action": "created",
      "fromStatusId": null,
      "toStatusId": "64f000000000000000000501",
      "changedBy": "64f000000000000000000001",
      "note": "Ticket created",
      "createdAt": "2026-07-05T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-07-05T10:00:00.000Z",
  "updatedAt": "2026-07-05T10:00:00.000Z"
}
```

Allowed priorities:

```json
["low", "medium", "high", "urgent"]
```

### 6.4 Stage

Stages are workflow states like inbox, in progress, canceled, and done. Owner can edit these stages and add more stages.

```json
{
  "_id": "64f000000000000000000501",
  "name": "Inbox",
  "key": "inbox",
  "order": 1,
  "color": "#64748b",
  "isDefault": true,
  "isFinal": false,
  "isActive": true,
  "createdAt": "2026-07-05T10:00:00.000Z",
  "updatedAt": "2026-07-05T10:00:00.000Z"
}
```

Default stages:

```json
["inbox", "in_progress", "canceled", "done"]
```

### 6.5 Comment

```json
{
  "_id": "64f000000000000000000601",
  "ticketId": "64f000000000000000000401",
  "authorId": "64f000000000000000000001",
  "body": "I checked the laptop and confirmed the issue.",
  "visibility": "public",
  "createdAt": "2026-07-05T10:00:00.000Z",
  "updatedAt": "2026-07-05T10:00:00.000Z"
}
```

Allowed visibility values:

```json
["public", "internal"]
```

### 6.6 Audit Log

```json
{
  "_id": "64f000000000000000000701",
  "actorId": "64f000000000000000000901",
  "action": "role_updated",
  "entityType": "user",
  "entityId": "64f000000000000000000001",
  "before": {
    "role": "employee"
  },
  "after": {
    "role": "supervisor"
  },
  "createdAt": "2026-07-05T10:00:00.000Z"
}
```

## 7. Standard Response Format

### 7.1 Success Response

```json
{
  "success": true,
  "message": "Tickets fetched successfully",
  "data": {}
}
```

### 7.2 Error Response

```json
{
  "success": false,
  "message": "You do not have permission to access this resource",
  "error": {
    "code": "FORBIDDEN",
    "details": null
  }
}
```

### 7.3 Pagination Response

```json
{
  "success": true,
  "message": "Tickets fetched successfully",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 120,
      "totalPages": 6,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## 8. Authentication Endpoints

### 8.1 Register User

```http
POST /auth/register
```

Access:

- Owner
- Optional: Manager if owner allows managers to create users

Request body:

```json
{
  "name": "Ahmed Ali",
  "email": "ahmed@company.com",
  "password": "StrongPassword123",
  "role": "employee",
  "departmentId": "64f000000000000000000101",
  "supervisorId": "64f000000000000000000201"
}
```

### 8.2 Login

```http
POST /auth/login
```

Access:

- Public

Request body:

```json
{
  "email": "ahmed@company.com",
  "password": "StrongPassword123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<jwt_access_token>",
    "user": {
      "_id": "64f000000000000000000001",
      "name": "Ahmed Ali",
      "email": "ahmed@company.com",
      "role": "employee",
      "departmentId": "64f000000000000000000101"
    }
  }
}
```

### 8.3 Get Current User

```http
GET /auth/me
```

Access:

- Employee
- Supervisor
- Manager
- Owner

### 8.4 Logout

```http
POST /auth/logout
```

Access:

- Employee
- Supervisor
- Manager
- Owner

## 9. Ticket Endpoints

### 9.1 Create Ticket

```http
POST /tickets
```

Access:

- Employee
- Supervisor
- Manager
- Owner

Request body:

```json
{
  "title": "Laptop keyboard not working",
  "description": "The employee laptop keyboard stopped responding.",
  "assignedUserId": "64f000000000000000000002",
  "assignedDepartmentId": "64f000000000000000000101",
  "priority": "medium",
  "type": "support",
  "dueDate": "2026-07-10T10:00:00.000Z",
  "tags": ["hardware", "laptop"]
}
```

### 9.2 Get Tickets

```http
GET /tickets
```

Access:

- Employee
- Supervisor
- Manager
- Owner

Visibility rules:

- Employee sees tickets assigned to them or assigned to their department.
- Supervisor sees employee visibility plus tickets assigned to employees in their team.
- Manager sees all tickets for all departments.
- Owner sees all tickets and all ticket details.

Query parameters:

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| page | number | No | Page number. Default is 1. |
| limit | number | No | Items per page. Default is 20. |
| statusId | string | No | Filter by stage/status. |
| assignedUserId | string | No | Filter by assigned user. |
| assignedDepartmentId | string | No | Filter by department. |
| priority | string | No | Filter by priority. |
| search | string | No | Search by title, description, or ticket number. |
| fromDate | string | No | Filter tickets created after date. |
| toDate | string | No | Filter tickets created before date. |

### 9.3 Get Ticket By ID

```http
GET /tickets/:ticketId
```

Access:

- Employee, only if assigned to them or their department.
- Supervisor, only if assigned to their department or team.
- Manager, all tickets.
- Owner, all tickets.

### 9.4 Update Ticket

```http
PATCH /tickets/:ticketId
```

Access:

- Employee, limited fields on accessible tickets.
- Supervisor, accessible department/team tickets.
- Manager, all tickets.
- Owner, all tickets.

### 9.5 Change Ticket Stage

```http
PATCH /tickets/:ticketId/status
```

Access:

- Employee, only if workflow allows it for accessible tickets.
- Supervisor, accessible team or department tickets.
- Manager, all tickets.
- Owner, all tickets.

Request body:

```json
{
  "statusId": "64f000000000000000000502",
  "note": "Work started by IT team"
}
```

### 9.6 Assign Ticket

```http
PATCH /tickets/:ticketId/assign
```

Access:

- Supervisor, only inside their team or department.
- Manager, all departments.
- Owner, all departments.

Request body:

```json
{
  "assignedUserId": "64f000000000000000000002",
  "assignedDepartmentId": "64f000000000000000000101",
  "note": "Assigned to IT support employee"
}
```

### 9.7 Add Ticket Comment

```http
POST /tickets/:ticketId/comments
```

Access:

- Employee, accessible tickets only.
- Supervisor, accessible tickets only.
- Manager, all tickets.
- Owner, all tickets.

### 9.8 Get Ticket Comments

```http
GET /tickets/:ticketId/comments
```

Access:

- Employee, accessible tickets only.
- Supervisor, accessible tickets only.
- Manager, all tickets.
- Owner, all tickets.

### 9.9 Archive Ticket

```http
PATCH /tickets/:ticketId/archive
```

Access:

- Manager
- Owner

### 9.10 Delete Ticket

```http
DELETE /tickets/:ticketId
```

Access:

- Owner

## 10. Dashboard Endpoints

### 10.1 Employee Dashboard

```http
GET /dashboard/me
```

Access:

- Employee
- Supervisor
- Manager
- Owner

Response:

```json
{
  "success": true,
  "message": "Dashboard fetched successfully",
  "data": {
    "assignedTickets": 12,
    "departmentTickets": 25,
    "completedTickets": 8,
    "overdueTickets": 2,
    "averageCompletionTimeHours": 18.5
  }
}
```

### 10.2 Supervisor Team Dashboard

```http
GET /dashboard/team
```

Access:

- Supervisor
- Manager
- Owner

Visibility rules:

- Supervisor sees only their team.
- Manager sees all teams or can filter by supervisor.
- Owner sees all teams.

### 10.3 Manager Department Dashboard

```http
GET /dashboard/departments
```

Access:

- Manager
- Owner

### 10.4 Supervisor Performance Dashboard

```http
GET /dashboard/supervisors
```

Access:

- Manager
- Owner

### 10.5 Owner System Dashboard

```http
GET /dashboard/system
```

Access:

- Owner

## 11. User Management Endpoints

### 11.1 Get Users

```http
GET /users
```

Access:

- Manager, optional limited access.
- Owner.

Query parameters:

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| role | string | No | Filter by role. |
| departmentId | string | No | Filter by department. |
| supervisorId | string | No | Filter by supervisor. |
| search | string | No | Search by name or email. |

### 11.2 Get User By ID

```http
GET /users/:userId
```

Access:

- Manager, optional limited access.
- Owner.

### 11.3 Update User

```http
PATCH /users/:userId
```

Access:

- Owner.

### 11.4 Update User Role

```http
PATCH /users/:userId/role
```

Access:

- Owner.

Request body:

```json
{
  "role": "supervisor"
}
```

### 11.5 Deactivate User

```http
PATCH /users/:userId/deactivate
```

Access:

- Owner.

## 12. Department Endpoints

### 12.1 Create Department

```http
POST /departments
```

Access:

- Owner.

### 12.2 Get Departments

```http
GET /departments
```

Access:

- Employee
- Supervisor
- Manager
- Owner

### 12.3 Update Department

```http
PATCH /departments/:departmentId
```

Access:

- Owner.

## 13. Stage Management Endpoints

Stages are controlled by owner only.

### 13.1 Create Stage

```http
POST /stages
```

Access:

- Owner.

Request body:

```json
{
  "name": "Waiting For Approval",
  "key": "waiting_for_approval",
  "order": 3,
  "color": "#f59e0b",
  "isFinal": false
}
```

### 13.2 Get Stages

```http
GET /stages
```

Access:

- Employee
- Supervisor
- Manager
- Owner

### 13.3 Update Stage

```http
PATCH /stages/:stageId
```

Access:

- Owner.

### 13.4 Reorder Stages

```http
PATCH /stages/reorder
```

Access:

- Owner.

### 13.5 Delete Or Deactivate Stage

```http
DELETE /stages/:stageId
```

Access:

- Owner.

Important rule:

- If tickets are using this stage, do not hard delete it. Deactivate it instead or require moving tickets to another stage first.

## 14. Reports Endpoints

### 14.1 Ticket Report

```http
GET /reports/tickets
```

Access:

- Supervisor, own team or department only.
- Manager, all departments.
- Owner, all departments.

### 14.2 Performance Report

```http
GET /reports/performance
```

Access:

- Supervisor, own team only.
- Manager, all teams and supervisors.
- Owner, all users.

## 15. Audit Log Endpoints

### 15.1 Get Audit Logs

```http
GET /audit-logs
```

Access:

- Owner.

## 16. Access Control Rules

### 16.1 Ticket Visibility Query Rules

Employee ticket query:

```js
{
  $or: [
    { assignedUserId: req.user.userId },
    { assignedDepartmentId: req.user.departmentId }
  ]
}
```

Supervisor ticket query:

```js
{
  $or: [
    { assignedUserId: req.user.userId },
    { assignedDepartmentId: req.user.departmentId },
    { assignedUserId: { $in: teamEmployeeIds } }
  ]
}
```

Manager and owner ticket query:

```js
{}
```

### 16.2 Role Middleware

Recommended middleware:

```js
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
        error: {
          code: 'FORBIDDEN',
          details: null
        }
      });
    }

    next();
  };
}
```

## 17. Status Codes

| Status Code | Meaning |
| --- | --- |
| 200 | Request completed successfully. |
| 201 | Resource created successfully. |
| 400 | Invalid request data. |
| 401 | Missing or invalid authentication token. |
| 403 | Authenticated user does not have permission. |
| 404 | Resource was not found. |
| 409 | Resource conflict, such as duplicated email or stage key. |
| 422 | Validation failed. |
| 500 | Internal server error. |

## 18. Validation Rules

### 18.1 Ticket Validation

- `title` is required.
- `description` is required.
- `assignedDepartmentId` is required when `assignedUserId` is not provided.
- `priority` must be one of `low`, `medium`, `high`, or `urgent`.
- `statusId` must reference an active stage.
- `dueDate` must be a valid date when provided.

### 18.2 User Validation

- `name` is required.
- `email` is required and must be unique.
- `password` is required on create.
- `role` must be one of `employee`, `supervisor`, `manager`, or `owner`.
- `departmentId` is required for employees and supervisors.
- `supervisorId` is recommended for employees.

### 18.3 Stage Validation

- `name` is required.
- `key` is required and must be unique.
- `order` is required and must be numeric.
- `isDefault` should be true for only one initial stage.
- At least one final stage should exist, such as `done` or `canceled`.

## 19. Suggested Route Structure

```txt
routes/
  auth.route.js
  tickets.route.js
  users.route.js
  departments.route.js
  stages.route.js
  dashboard.route.js
  reports.route.js
  auditLogs.route.js

controllers/
  auth.controller.js
  tickets.controller.js
  users.controller.js
  departments.controller.js
  stages.controller.js
  dashboard.controller.js
  reports.controller.js
  auditLogs.controller.js

models/
  user.model.js
  ticket.model.js
  department.model.js
  stage.model.js
  comment.model.js
  auditLog.model.js

middlewares/
  auth.middleware.js
  role.middleware.js
  validate.middleware.js
  error.middleware.js
```

## 20. Notes
- The current `app.js` does not register the routes yet. Recommended example: `app.use('/api/tickets', ticketsRoutes)`.
- The current `routes/tickets.route.js` defines `GET /tickets`. If mounted at `/api/tickets`, this becomes `/api/tickets/tickets`. A cleaner route is `router.get('/', ticketsController.getUserTickets)`.
- Use MongoDB ObjectId references for users, departments, stages, comments, and audit logs instead of storing names as strings. Names can change, but IDs stay stable.
- Keep `ticketNumber` as a readable sequential number for users, and keep `_id` as the database identifier.
- Use audit logs for sensitive actions like role changes, stage changes, ticket deletion, and user deactivation.
- Use soft delete or archive for tickets and users instead of hard delete in most cases.
- Dashboard and report endpoints should calculate data using MongoDB aggregation pipelines for better performance.
- Add indexes for `assignedUserId`, `assignedDepartmentId`, `statusId`, `priority`, `createdAt`, and `dueDate`.
- Add validation with Joi before controller logic.
- Add a global error middleware so controllers stay clean.
- Use role middleware and ticket-scope middleware separately. Role middleware answers "can this role use this endpoint?", while scope middleware answers "can this user access this exact ticket?".
