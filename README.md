# HostelFlow 🏢

A comprehensive, modern Hostel Management System aimed at simplifying administrative workflows, improving student communication, and effectively managing hostel facilities. Built with a robust full-stack architecture featuring a dynamic React frontend and a fast, scalable FastAPI backend.



## 🌟 Features

- **Admin Dashboard & Analytics:** Real-time metrics for quick insights into total students, leaves pending, and open complaints via an intuitive interface.
- **Advanced Complaint Management:** Robust filtering options (status, date, category) along with automated archival of resolved complaints older than 14 days to keep the dashboard clutter-free.
- **Detailed Student Roster:** A comprehensive tabular view of all registered students, complete with quick action modals for seamless administration.
- **Authentication & Security:** Secure JWT-based authentication equipped with role-based access control (Super Admin, Admin, and Student levels). Securely managed environment variables.
- **Modern Responsive UI:** Fully responsive and accessible design styled with Tailwind CSS, enriched by smooth Framer Motion animations and Radix UI primitives.

## 🛠 Tech Stack

### Frontend
- **Framework:** React 18, Vite, TypeScript
- **Styling & UI:** Tailwind CSS, Framer Motion, Radix UI, Lucide React icons
- **Routing & HTTP Client:** React Router DOM v7, Axios

### Backend
- **Framework:** FastAPI, Uvicorn
- **Database:** MongoDB (using the Motor async driver)
- **Validation & Auth:** Pydantic, Passlib (bcrypt), python-jose (JWT)
- **Testing:** Pytest, pytest-asyncio, httpx

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python](https://www.python.org/) (v3.10+ recommended)
- A running [MongoDB](https://www.mongodb.com/) instance or MongoDB Atlas cluster

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/HostelFlow.git
cd HostelFlow
```

#### 2. Backend Setup
```bash
cd backend
python -m venv venv

# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

pip install -r requirements.txt
```
Copy `.env.example` to `.env` (if exists) and fill in your MongoDB URI and JWT secrets.
```bash
uvicorn main:app --reload
```
The API documentation will be accessible at `http://localhost:8000/docs`.

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
Copy `.env.example` to `.env` and set your backend API URL appropriately (e.g., `VITE_API_URL=http://localhost:8000`).
```bash
npm run dev
```
The frontend should now be running on `http://localhost:5173`.

## 🤝 Contributing
Contributions, bug reports, and feature requests are always welcome! Feel free to check the [issues page](https://github.com/yourusername/HostelFlow/issues) if you want to contribute.

## 📄 License
This project is licensed under the MIT License.
