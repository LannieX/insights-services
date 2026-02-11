//Environment Variables
DATABASE_URL="postgresql://postgres:CI6IkpXVCJ9@db.sbadvjunxayamgstvjmk.supabase.co:5432/postgres"
JWT_SECRET="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
PORT=8000


//Setup Instructions
npx prisma generate
npm run dev
