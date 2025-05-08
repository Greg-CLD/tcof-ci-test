# API Documentation

## Success Factors

The success factors API endpoints provide access to the TCOF Success Factors, which are key principles for successful technology implementation.

### Get All Success Factors

Retrieves all success factors.

**Endpoint:** `GET /api/admin/canonical-success-factors`

**Response:**
- 200 OK: Returns an array of success factors
- 401 Unauthorized: Authentication required
- 403 Forbidden: User does not have admin privileges

**Example Response:**
```json
[
  {
    "id": "sf-1",
    "title": "1.1 Ask Why",
    "description": "Define clear, achievable goals that solve known problems.",
    "tasks": {
      "Identification": ["Align with organizational goals", "Define measurable outcomes"],
      "Definition": [],
      "Delivery": [],
      "Closure": []
    }
  },
  {
    "id": "sf-2",
    "title": "1.2 Get a Masterbuilder",
    "description": "Find a capable leader with relevant experience who can guide the project.",
    "tasks": {
      "Identification": ["Identify project leader", "Assess leadership capability"],
      "Definition": ["Establish project governance"],
      "Delivery": ["Review leadership effectiveness"],
      "Closure": []
    }
  }
]
```

### Get Success Factor by ID

Retrieves a specific success factor by its ID.

**Endpoint:** `GET /api/admin/canonical-success-factors/:id`

**Parameters:**
- `id` (path parameter): The ID of the success factor to retrieve

**Response:**
- 200 OK: Returns the requested success factor
- 401 Unauthorized: Authentication required
- 403 Forbidden: User does not have admin privileges
- 404 Not Found: Success factor with the specified ID not found

**Example Response:**
```json
{
  "id": "sf-1",
  "title": "1.1 Ask Why",
  "description": "Define clear, achievable goals that solve known problems.",
  "tasks": {
    "Identification": ["Align with organizational goals", "Define measurable outcomes"],
    "Definition": [],
    "Delivery": [],
    "Closure": []
  }
}
```

### Create Success Factor

Creates a new success factor.

**Endpoint:** `POST /api/admin/canonical-success-factors`

**Request Body:**
```json
{
  "id": "sf-13",
  "title": "5.1 New Success Factor",
  "description": "Description of the new success factor",
  "tasks": {
    "Identification": ["Task 1", "Task 2"],
    "Definition": ["Task 3"],
    "Delivery": ["Task 4"],
    "Closure": ["Task 5"]
  }
}
```

**Response:**
- 201 Created: Success factor created successfully
- 400 Bad Request: Invalid request body
- 401 Unauthorized: Authentication required
- 403 Forbidden: User does not have admin privileges
- 409 Conflict: Success factor with the specified ID already exists

**Example Response:**
```json
{
  "id": "sf-13",
  "title": "5.1 New Success Factor",
  "description": "Description of the new success factor",
  "tasks": {
    "Identification": ["Task 1", "Task 2"],
    "Definition": ["Task 3"],
    "Delivery": ["Task 4"],
    "Closure": ["Task 5"]
  }
}
```

### Update Success Factor

Updates an existing success factor.

**Endpoint:** `PUT /api/admin/canonical-success-factors/:id`

**Parameters:**
- `id` (path parameter): The ID of the success factor to update

**Request Body:**
```json
{
  "title": "1.1 Ask Why (Updated)",
  "description": "Updated description for the success factor",
  "tasks": {
    "Identification": ["Updated task 1", "Updated task 2"],
    "Definition": ["New definition task"],
    "Delivery": ["New delivery task"],
    "Closure": ["New closure task"]
  }
}
```

**Response:**
- 200 OK: Success factor updated successfully
- 400 Bad Request: Invalid request body
- 401 Unauthorized: Authentication required
- 403 Forbidden: User does not have admin privileges
- 404 Not Found: Success factor with the specified ID not found

**Example Response:**
```json
{
  "id": "sf-1",
  "title": "1.1 Ask Why (Updated)",
  "description": "Updated description for the success factor",
  "tasks": {
    "Identification": ["Updated task 1", "Updated task 2"],
    "Definition": ["New definition task"],
    "Delivery": ["New delivery task"],
    "Closure": ["New closure task"]
  }
}
```

### Delete Success Factor

Deletes a success factor.

**Endpoint:** `DELETE /api/admin/canonical-success-factors/:id`

**Parameters:**
- `id` (path parameter): The ID of the success factor to delete

**Response:**
- 204 No Content: Success factor deleted successfully
- 401 Unauthorized: Authentication required
- 403 Forbidden: User does not have admin privileges
- 404 Not Found: Success factor with the specified ID not found