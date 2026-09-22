# TravelLab REST API

## Activities

### POST /activities
Create a new activity.

Request body:

{
  "title": "Visit the Louvre",
  "time": "10:00",
  "location": "Paris",
  "notes": "Buy tickets beforehand"
}

### GET /activities
Get activities.

### GET /activities/:id
Get a specific activity.

### PATCH /activities/:id
Update an activity.

### DELETE /activities/:id
Delete an activity.