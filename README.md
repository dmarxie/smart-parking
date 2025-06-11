# Smart Parking MVP

## Project Overview

A smart parking management system that helps users find and manage parking spaces efficiently.


### Features

- User authentication with JWT
- Role-based access control (Admin and Basic User)
- Parking space management
- Real-time parking availability
- Intuitive and User-friendly interface

## Tech Stack

### Backend
- Django
- Django REST Framework
- SQLite
- JWT Authentication
- Python 3.8+

### Frontend
- React
- Material-UI
- Axios
- React Router

## Setup Instructions

### Backend Setup
1. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Run migrations:
   ```bash
   python manage.py migrate
   ```

4. Start development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```

## Development

- Backend runs on http://localhost:8000
- Frontend runs on http://localhost:3000
- API documentation available at http://localhost:8000/api/docs/

### TODO: Add deployment notes

## License

This project is licensed under the MIT License - see the LICENSE file for details.
