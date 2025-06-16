# Smart Parking MVP

## Project Overview

A smart parking management system that helps users find and manage parking spaces efficiently. This system allows users to:

- Find available parking spots in real-time
- Make and manage parking reservations
- View parking history and receipts
- Get notifications about their parking status

For Users

- Find available parking spots in real-time
- Make and manage parking reservations
- Update profile and change password
- View stats about their reservations

For Administrators

- Manage parking locations and spots
- Monitor parking usage and revenue
- Handle user accounts and permissions
- Generate reports and analytics

### Features

- User authentication with JWT
- Role-based access control (Admin and Basic User)
- Parking space management
- Real-time parking availability
- Intuitive and User-friendly interface
- Reservation management
- Parking history tracking
- RESTful API with comprehensive documentation

## Tech Stack

### Backend

- Django 5.0.2 - Web framework
- Django REST Framework 3.14.0 - API development
- SQLite (Development) / PostgreSQL (Production) - Database
- JWT Authentication - Secure user authentication
- Python 3.8+ - Programming language
- Django CORS Headers - Cross-origin resource sharing
- DRF Spectacular - API documentation

### Frontend

- React 19 - User interface library
- TypeScript - Type-safe JavaScript
- Material-UI - Component library
- Bootstrap 5 - CSS framework
- Vite - Build tool and development server
- React Router - Client-side routing
- React Query - Data fetching and caching
- Axios - HTTP client
- Formik & Yup - Form handling and validation

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Node.js 18 or higher
- npm or yarn package manager
- Git
- PostgreSQL (for production)

## Setup Instructions

### Backend Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/dmarxie/smart-parking.git
   cd smart-parking
   ```

2. Create and activate virtual environment:

   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Unix/MacOS
   python -m venv venv
   source venv/bin/activate
   ```

3. Install Python dependencies:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Set up environment variables:

   ```bash
   # Copy the example environment file directory
   cp .env.example .env
   ```

   # Edit .env with your configuration:

   #SECRET_KEY=your-secret-key-here
   #ALGORITHM=HS256
   #ACCESS_TOKEN_EXPIRE_MINUTES=30

5. Run database migrations:

   # Apply database migrations (creates SQLite database automatically)

   ```bash
   python manage.py migrate
   ```

6. Create a superuser (admin account):

   # Follow the prompts to create an admin account

   ```bash
   python manage.py createsuperuser
   ```

7. Start development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. Set up environment variables:

   # Copy the example environment file

   ```bash
   cp .env.example .env
   ```

   # Edit .env with your configuration:

   #VITE_API_URL=http://localhost:8000

2. Install Node.js dependencies:

   ```bash
   cd frontend
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Development

### Local Development

- Backend runs on http://localhost:8000
- Frontend runs on http://localhost:5173
- API documentation available at http://localhost:8000/api/docs/

## Deployment

### Backend Deployment

1. **Production Environment**:

   - Use PostgreSQL instead of SQLite
   - Set `DEBUG=False` in production
   - Configure proper `ALLOWED_HOSTS`
   - Use environment variables for sensitive data

2. **Deployment Steps**:

   ```bash
   # Collect static files
   python manage.py collectstatic

   # Run migrations
   python manage.py migrate

   # Create production superuser
   python manage.py createsuperuser
   ```

### Frontend Deployment

1. **Build Process**:

   ```bash
   # Install dependencies
   npm install

   # Create production build
   npm run build
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
