# Monorepo Notes

Why is a monorepo better than two separate repos for this project?

-->A monorepo is better for this project because both the backend and frontend are closely related and developed together. Having them in one place makes it easier to manage dependencies, run both servers with one command, and keep the codebase clean and organised.

When would two separate repos be better?

-->Two separate repos would be better when two developers or teams are working independently one on the backend and another on the frontend. This allows each team to deploy their work independently without affecting the other

What is the cost of a monorepo?

-->The cost of a monorepo is that it can become complex as the project grows. Setting up automated testing and deployment for multiple packages at once is harder. The lockfile also becomes very large and harder to manage.