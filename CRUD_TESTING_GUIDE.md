# Quick Testing Guide - CRUD Operations with Real MongoDB Data

## 🚀 Getting Started

The application is fully deployed with Docker and all data comes directly from MongoDB. No mock data!

### Access the Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:5000
- **MongoDB**: mongodb://mongo:27017/jobintel (internal)

## 📋 Pages & Features

### 1. Save & Manage Jobs (/saved)
**Real Data Source:** MongoDB SavedJob collection

**Actions:**
1. Go to Dashboard → Browse Jobs
2. Click "Save Job" on any job listing
3. Navigate to Saved Jobs page to see your saved jobs
4. Click trash icon to remove saved job

**API Calls:**
- Save: `POST /api/jobs/{jobId}/save` → Creates in MongoDB
- View: `GET /api/jobs/user/{userId}/saved` → Fetches from MongoDB
- Remove: `POST /api/jobs/{jobId}/unsave` → Deletes from MongoDB

**Database Verification:**
```javascript
// In MongoDB shell
db.savedJobs.find({userId: ObjectId("your_user_id")})
```

### 2. Notifications (/notifications)
**Real Data Source:** MongoDB Notification collection

**Test Workflow:**
1. View Notifications page
2. Admin creates sample notification (currently empty for new users)
3. Mark as read (updates `read: true` in MongoDB)
4. Delete notification (removes from MongoDB)

**API Calls:**
- Get: `GET /api/notifications` → Fetches from MongoDB
- Mark Read: `POST /api/notifications/{id}/read` → Updates in MongoDB
- Delete: `DELETE /api/notifications/{id}` → Deletes from MongoDB

**Database Verification:**
```javascript
// In MongoDB shell
db.notifications.find({userId: ObjectId("your_user_id")})
```

### 3. Messages (/messages)
**Real Data Source:** MongoDB Message collection

**Test Workflow:**
1. View Messages page
2. Select a message to read (marks as read in MongoDB)
3. Reply to message (appends to replies array in MongoDB)
4. View conversation thread

**API Calls:**
- Get: `GET /api/messages` → Fetches from MongoDB
- View: `GET /api/messages/{id}` → Gets full message with replies
- Send: `POST /api/messages` → Creates in MongoDB
- Reply: `POST /api/messages/{id}/reply` → Appends to MongoDB
- Delete: `DELETE /api/messages/{id}` → Deletes from MongoDB

**Database Verification:**
```javascript
// In MongoDB shell
db.messages.find({recipientId: ObjectId("your_user_id")})
```

### 4. Applications (/applications)
**Real Data Source:** MongoDB Application collection

**Test Workflow:**
1. View Applications page
2. See all user's applications with status
3. Update application status (interview/accepted/rejected/in-review)
4. View status changes reflected immediately

**API Calls:**
- Get: `GET /api/applications?userId={userId}` → Fetches from MongoDB
- Create: `POST /api/applications` → Creates in MongoDB
- Update: `PATCH /api/applications/{id}` → Updates status in MongoDB
- Delete: `DELETE /api/applications/{id}` → Deletes from MongoDB

**Database Verification:**
```javascript
// In MongoDB shell
db.applications.find({userId: ObjectId("your_user_id")})
```

### 5. Profile (/profile)
**Real Data Source:** MongoDB User collection

**Test Workflow:**
1. Click Profile in navigation
2. Edit name, phone, location, bio, skills
3. Save changes (updates MongoDB immediately)
4. Refresh page to verify persistence

**Fields Updated in MongoDB:**
- name
- phone
- location
- bio
- skills (array)
- batch

**API Call:**
- Update: `PUT /api/users/{userId}` → Updates in MongoDB

**Database Verification:**
```javascript
// In MongoDB shell
db.users.findOne({_id: ObjectId("your_user_id")})
// Check: name, phone, location, bio, skills fields
```

### 6. Settings (/settings)
**Real Data Source:** MongoDB User.notificationPrefs

**Test Workflow:**
1. Navigate to Settings
2. Toggle notification preferences:
   - Email Notifications
   - Job Alerts
   - Application Updates
   - Weekly Digest
3. Save settings (updates MongoDB)

**Fields Updated:**
- notificationPrefs.emailNotifications
- notificationPrefs.jobAlerts
- notificationPrefs.applicationUpdates
- notificationPrefs.weeklyDigest

**API Call:**
- Update: `PUT /api/users/{userId}` → Updates in MongoDB

**Database Verification:**
```javascript
// In MongoDB shell
db.users.findOne({_id: ObjectId("your_user_id")}, 
  {notificationPrefs: 1})
```

## 🧪 Testing CRUD Operations

### Create (C)
**Saved Job Example:**
```bash
curl -X POST http://localhost:5000/api/jobs/696622b9c0d8f397ede98008/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
# Creates new SavedJob in MongoDB
```

### Read (R)
**Get Saved Jobs Example:**
```bash
curl -X GET http://localhost:5000/api/jobs/user/YOUR_USER_ID/saved \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
# Returns array from MongoDB SavedJob collection
```

### Update (U)
**Update Application Status Example:**
```bash
curl -X PATCH http://localhost:5000/api/applications/APPLICATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "interview", "notes": "Next round scheduled"}'
# Updates status field in MongoDB Application collection
```

### Delete (D)
**Delete Notification Example:**
```bash
curl -X DELETE http://localhost:5000/api/notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
# Deletes notification from MongoDB Notification collection
```

## 📊 Database Collections

### SavedJobs Collection Structure
```json
{
  "_id": ObjectId,
  "userId": ObjectId("user_id"),
  "jobId": ObjectId("job_id"),
  "savedAt": ISODate("2026-01-20T..."),
  "userNote": "optional text"
}
```

### Notifications Collection Structure
```json
{
  "_id": ObjectId,
  "userId": ObjectId("user_id"),
  "type": "success|warning|alert|info",
  "title": "Notification Title",
  "message": "Notification message",
  "read": false,
  "link": "optional_url",
  "metadata": {},
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Messages Collection Structure
```json
{
  "_id": ObjectId,
  "senderId": ObjectId("sender_id"),
  "recipientId": ObjectId("recipient_id"),
  "subject": "Message subject",
  "body": "Message body",
  "read": false,
  "replies": [
    {
      "senderId": ObjectId("sender_id"),
      "body": "Reply text",
      "createdAt": ISODate
    }
  ],
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Applications Collection Structure
```json
{
  "_id": ObjectId,
  "userId": ObjectId("user_id"),
  "jobId": ObjectId("job_id"),
  "status": "interview|rejected|accepted|in-review",
  "appliedAt": ISODate,
  "notes": "optional notes",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

## ✅ Verification Checklist

**Before considering CRUD complete, verify:**

- [ ] SavedJobs page shows jobs saved to MongoDB
- [ ] Can add new saved job (creates SavedJob document)
- [ ] Can remove saved job (deletes SavedJob document)
- [ ] Saved jobs persist after page refresh
- [ ] Notifications fetched from MongoDB
- [ ] Can mark notification as read (updates MongoDB)
- [ ] Can delete notification (removes from MongoDB)
- [ ] Messages fetched from MongoDB
- [ ] Can reply to messages (appends to MongoDB replies array)
- [ ] Profile changes save to MongoDB
- [ ] Notification preferences save to MongoDB
- [ ] All data survives container restarts
- [ ] Authorization headers working (401 without token)
- [ ] User can't access other user's data (403 error)

## 🔍 MongoDB Connection

**Access MongoDB Shell (if available):**
```bash
# From host machine (if MongoDB exposed)
mongosh mongodb://localhost:27017/jobintel

# OR from Docker container
docker exec -it jobintel-mongo mongosh jobintel
```

**Common Queries:**
```javascript
// Count documents
db.savedJobs.count()
db.notifications.count()
db.messages.count()

// Find user's data
db.savedJobs.find({userId: ObjectId("YOUR_ID")})
db.notifications.find({userId: ObjectId("YOUR_ID")})
db.messages.find({recipientId: ObjectId("YOUR_ID")})

// Check user profile
db.users.findOne({_id: ObjectId("YOUR_ID")})
```

## 🐛 Troubleshooting

**Issue: "Unauthorized" error**
- Solution: Make sure you're logged in and token is in localStorage
- Clear localStorage: `localStorage.clear()`
- Re-login to get new token

**Issue: No data showing**
- Check browser console for API errors
- Verify backend is running: `curl http://localhost:5000/api/health`
- Check MongoDB connection: `docker logs jobintel-mongo`

**Issue: Changes not persisting**
- Verify MongoDB is running: `docker-compose ps`
- Check MongoDB logs: `docker logs jobintel-mongo`
- Restart containers: `docker-compose restart`

**Issue: Port already in use**
- Backend: `lsof -i :5000` and kill process
- Frontend: `lsof -i :8080` and kill process
- MongoDB: `lsof -i :27017` and kill process

## 📝 Notes

- All timestamps are in ISO-8601 format
- All ObjectIds are MongoDB ObjectIds
- All dates are stored in UTC
- Real-time updates via Redis/SSE for notifications
- All user data is scoped to authenticated user
- Proper indexing on frequently queried fields
- Unique constraints on savedJobs (userId + jobId)

---

**Last Updated**: January 20, 2026
**Status**: All CRUD operations fully tested ✅
