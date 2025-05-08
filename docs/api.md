# API Documentation

## Admin API Endpoints

### Success Factors

These endpoints allow administrators to manage success factors for the TCOF toolkit.

#### GET `/api/admin/success-factors`

Returns a list of all success factors.

**Response:**
```json
[
  {
    "id": "1.1",
    "title": "Ask Why",
    "description": "Ensure the project has a clear and compelling purpose",
    "tasks": {
      "Identification": ["Task 1", "Task 2"],
      "Definition": ["Task 1", "Task 2"],
      "Delivery": ["Task 1", "Task 2"],
      "Closure": ["Task 1", "Task 2"]
    }
  },
  // Additional factors...
]
```

#### GET `/api/admin/success-factors/:id`

Returns a specific success factor by ID.

**Parameters:**
- `id`: The ID of the success factor to retrieve (e.g., "1.1")

**Response:**
```json
{
  "id": "1.1",
  "title": "Ask Why",
  "description": "Ensure the project has a clear and compelling purpose",
  "tasks": {
    "Identification": ["Task 1", "Task 2"],
    "Definition": ["Task 1", "Task 2"],
    "Delivery": ["Task 1", "Task 2"],
    "Closure": ["Task 1", "Task 2"]
  }
}
```

#### POST `/api/admin/success-factors`

Creates a new success factor.

**Request Body:**
```json
{
  "id": "1.5",
  "title": "New Success Factor",
  "description": "Description of the new success factor",
  "tasks": {
    "Identification": ["Task 1", "Task 2"],
    "Definition": ["Task 1", "Task 2"],
    "Delivery": ["Task 1", "Task 2"],
    "Closure": ["Task 1", "Task 2"]
  }
}
```

**Required Fields:**
- `id`: String, required
- `title`: String, required
- `tasks`: Object with arrays for each project stage, required
- `description`: String, optional (defaults to empty string)

**Response:**
```json
{
  "id": "1.5",
  "title": "New Success Factor",
  "description": "Description of the new success factor",
  "tasks": {
    "Identification": ["Task 1", "Task 2"],
    "Definition": ["Task 1", "Task 2"],
    "Delivery": ["Task 1", "Task 2"],
    "Closure": ["Task 1", "Task 2"]
  }
}
```

#### PUT `/api/admin/success-factors/:id`

Updates an existing success factor.

**Parameters:**
- `id`: The ID of the success factor to update (e.g., "1.1")

**Request Body:**
```json
{
  "id": "1.1",
  "title": "Updated Success Factor Title",
  "description": "Updated description for the success factor",
  "tasks": {
    "Identification": ["Updated Task 1", "Updated Task 2"],
    "Definition": ["Updated Task 1", "Updated Task 2"],
    "Delivery": ["Updated Task 1", "Updated Task 2"],
    "Closure": ["Updated Task 1", "Updated Task 2"]
  }
}
```

**Required Fields:**
- `id`: String, required (must match the ID in the URL)
- `title`: String, required
- `tasks`: Object with arrays for each project stage, required
- `description`: String, optional (defaults to empty string)

**Response:**
```json
{
  "id": "1.1",
  "title": "Updated Success Factor Title",
  "description": "Updated description for the success factor",
  "tasks": {
    "Identification": ["Updated Task 1", "Updated Task 2"],
    "Definition": ["Updated Task 1", "Updated Task 2"],
    "Delivery": ["Updated Task 1", "Updated Task 2"],
    "Closure": ["Updated Task 1", "Updated Task 2"]
  }
}
```

#### DELETE `/api/admin/success-factors/:id`

Deletes a success factor.

**Parameters:**
- `id`: The ID of the success factor to delete (e.g., "1.1")

**Response:**
```json
{
  "success": true,
  "message": "Success factor with ID 1.1 deleted"
}
```

## Public API Endpoints

### Success Factors

These endpoints are available to all authenticated users.

#### GET `/api/factors`

Returns all success factors.

**Response:**
```json
[
  {
    "id": "1.1",
    "title": "Ask Why",
    "description": "Ensure the project has a clear and compelling purpose",
    "tasks": {
      "Identification": ["Task 1", "Task 2"],
      "Definition": ["Task 1", "Task 2"],
      "Delivery": ["Task 1", "Task 2"],
      "Closure": ["Task 1", "Task 2"]
    }
  },
  // Additional factors...
]
```