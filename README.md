# Ferie Beregner

Holiday calculator for tracking vacation days throughout the season (September to August) with SQLite database storage.

## Features

- Track 2.08 holidays earned per month
- Manage 5 extra holidays per season
- Add buffer from previous season
- Monthly planning and balance tracking
- Multiple holiday seasons support
- SQLite database storage
- Auto-save functionality

## Running Locally with Node.js

### Prerequisites
- Node.js 18 or higher

### Steps

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Running with Docker

### Prerequisites
- Docker installed on your system

### Build the Docker image

```bash
docker build -t ferie-beregner .
```

### Run the container

```bash
docker run -p 3000:3000 ferie-beregner
```

### Access the application

Open your browser and navigate to:
```
http://localhost:3000
```

### Stop the container

Find the container ID:
```bash
docker ps
```

Stop the container:
```bash
docker stop <container-id>
```

## Docker Commands Reference

**Build image:**
```bash
docker build -t ferie-beregner .
```

**Run container:**
```bash
docker run -d -p 3000:3000 --name ferie-app ferie-beregner
```

**View running containers:**
```bash
docker ps
```

**View logs:**
```bash
docker logs ferie-app
```

**Stop container:**
```bash
docker stop ferie-app
```

**Remove container:**
```bash
docker rm ferie-app
```

**Remove image:**
```bash
docker rmi ferie-beregner
```

## Environment Variables

- `PORT` - Port number for the server (default: 3000)
 
## Database

The application uses SQLite to store:
- **Seasons**: Holiday season information (name, start year, buffer)
- **Monthly Data**: Planned holidays for each month in each season

The database file `holidays.db` is created automatically in the application directory.

## API Endpoints

- `GET /api/seasons` - Get all seasons
- `GET /api/seasons/:id` - Get specific season
- `POST /api/seasons` - Create new season
- `PUT /api/seasons/:id` - Update season buffer
- `DELETE /api/seasons/:id` - Delete season
- `GET /api/seasons/:id/monthly` - Get monthly data for season
- `POST /api/seasons/:id/monthly` - Save monthly data

## Usage

1. **Create or select a holiday season** using the dropdown at the top
2. Enter any buffer holidays from the previous season
3. For each month, enter the number of holiday days you plan to take
4. The calculator automatically shows:
   - Accumulated holidays
   - Remaining regular holidays
   - Extra holidays used and remaining
   - Total balance
5. Your data is automatically saved to the database
