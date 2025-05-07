module.exports = {
  port: 3001, // Port for the browser connector server
  debug: true, // Enable debug logging
  allowedOrigins: ['http://localhost:3000'], // Allow connections from your Next.js app
  tools: {
    console: true,
    network: true,
    screenshot: true,
    accessibility: true,
    performance: true,
    seo: true,
    nextjs: true,
    debugger: true,
    audit: true,
    bestPractices: true
  }
}; 