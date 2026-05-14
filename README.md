# Job and Internship Tracker

This is a web application that helps users track job and internship applications, manage deadlines, search external job listings, and receive reminder notifications.

# Features

* User registration and login
* Password reset through email
* User profile page
* Add, edit, delete, and track applications
* Dashboard with application status summary
* Search and filter applications
* Deadline popup alerts
* Email reminder system for deadlines
* External job search using Adzuna API

# Technologies Used

* HTML
* CSS
* JavaScript
* Node.js
* Express.js
* MongoDB
* Mongoose
* bcrypt
* express-session
* Nodemailer
* node-cron
* Adzuna API
* dotenv

# Project Setup

## 2. Install Dependencies

npm install(on the Vs code terminal)

## 3. Start MongoDB

Make sure MongoDB is installed and running locally.

Default local MongoDB connection:

mongodb://127.0.0.1:27017/job_tracker

## 4. Update `.env` File

Inside the project you need to update `.env` file.

Add the following:

EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_google_app_password_here

ADZUNA_APP_ID=your_adzuna_app_id_here
ADZUNA_APP_KEY=your_adzuna_app_key_here

# Email Setup

The project uses Gmail through Nodemailer for:

* Password reset emails
* Deadline reminder emails

You must use a Google App Password, not your normal Gmail password.

## Steps

1. Log in to your Gmail account.
2. Go to Google Account Security.
3. Turn on 2-Step Verification.
4. Go to App Passwords.
5. Generate an app password for Mail.
6. Copy the 16-character app password.
7. Paste it into `.env`:

EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your16characterapppassword

Do not include spaces in the app password.
# External Job Search API Setup

The project uses the Adzuna API for external job search.

## Steps

1. Go to the Adzuna Developer website.
2. Create an account.
3. Create an application.
4. Copy the Application ID and Application Key.
5. Add them to `.env`:

ADZUNA_APP_ID=your_adzuna_app_id_here
ADZUNA_APP_KEY=your_adzuna_app_key_here

Without valid Adzuna credentials, the external job search feature may not work.

# Run the Project

After MongoDB is running and `.env` is configured, start the server(on the VS code terminal):

Command: npm start

Open the project in the browser: http://localhost:3000/index.html

# Deadline Reminder System

The system checks job deadlines automatically using `node-cron`.

If a job deadline is within 24 hours:

* A popup alert is shown on the dashboard
* An email reminder is sent to the user’s registered email
* The job is marked as reminded so duplicate emails are not sent

# Important Notes

* Do not upload your real `.env` file to a public GitHub repository.
* Each developer/user should create their own `.env` file locally.
* Email features require valid Gmail App Password credentials.
* External job search requires valid Adzuna API credentials.
* MongoDB must be running before starting the server.

# Notes: If you have any questions or problem running the project reach out to us at sanzida@nmsu.edu


