/**
 * Test script for verifying JSON responses from the task update endpoint
 */
const http = require('http');
const fs = require('fs');

function getCookieFromFile() {
  try {
    return fs.readFileSync('./cookies.txt', 'utf8').trim();
  } catch (err) {
    console.error('Could not read cookie file:', err.message);
    return '';
  }
}

async function testJsonResponse() {
  try {
    const cookie = getCookieFromFile();
    console.log('Using cookie:', cookie ?  : 'None');

    // First, get a test project
    const projectsOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/projects',
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    };

    // Make a request to get projects
    const projectsReq = http.request(projectsOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const projects = JSON.parse(data);
          if (!projects || !projects.length) {
            console.error('No projects found!');
            return;
          }
          
          const testProject = projects[0];
          console.log();
          
          // Get tasks for this project
          const tasksOptions = {
            hostname: 'localhost',
            port: 5000,
            path: `/api/projects/${testProject.id}/tasks`,
            method: 'GET',
            headers: {
              'Cookie': cookie,
              'Content-Type': 'application/json'
            }
          };
          
          const tasksReq = http.request(tasksOptions, (res) => {
            let taskData = '';
            
            res.on('data', (chunk) => {
              taskData += chunk;
            });
            
            res.on('end', () => {
              try {
                const tasks = JSON.parse(taskData);
                if (!tasks || !tasks.length) {
                  console.error('No tasks found for project!');
                  return;
                }
                
                // Find a Success Factor task if possible
                let testTask = tasks.find(t => t.origin === 'success-factor' || t.origin === 'factor');
                if (!testTask) {
                  // Fall back to any task
                  testTask = tasks[0];
                }
                
                console.log(`Using test task: ${testTask.id}`);
                console.log(`Task details: ${JSON.stringify({
                  text: testTask.text,
                  origin: testTask.origin,
                  completed: testTask.completed,
                  sourceId: testTask.sourceId
                }, null, 2)}`);
                
                // Create an update that toggles the completion status
                const update = {
                  completed: !testTask.completed
                };
                
                console.log(`Sending update: ${JSON.stringify(update)}`);
                
                // Make the PUT request
                const updateOptions = {
                  hostname: 'localhost',
                  port: 5000,
                  path: `/api/projects/${testProject.id}/tasks/${testTask.id}`,
                  method: 'PUT',
                  headers: {
                    'Cookie': cookie,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  }
                };
                
                const updateReq = http.request(updateOptions, (res) => {
                  console.log('Response status:', res.statusCode);
                  console.log('Content-Type:', res.headers['content-type']);
                  
                  let responseData = '';
                  
                  res.on('data', (chunk) => {
                    responseData += chunk;
                  });
                  
                  res.on('end', () => {
                    try {
                      // Try to parse as JSON
                      const parsedData = JSON.parse(responseData);
                      console.log('Response data:', JSON.stringify(parsedData, null, 2));
                      console.log('SUCCESS: Received proper JSON response!');
                    } catch (parseError) {
                      console.error('Error parsing response as JSON:', parseError.message);
                      console.error('Raw response (first 500 chars):', responseData.substring(0, 500));
                      
                      if (responseData.includes('<!DOCTYPE html>')) {
                        console.error('ERROR: Received HTML instead of JSON!');
                      }
                    }
                  });
                });
                
                updateReq.on('error', (error) => {
                  console.error('Error making update request:', error);
                });
                
                updateReq.write(JSON.stringify(update));
                updateReq.end();
              } catch (parseError) {
                console.error('Error parsing tasks response:', parseError);
              }
            });
          });
          
          tasksReq.on('error', (error) => {
            console.error('Error getting tasks:', error);
          });
          
          tasksReq.end();
        } catch (parseError) {
          console.error('Error parsing projects response:', parseError);
        }
      });
    });
    
    projectsReq.on('error', (error) => {
      console.error('Error getting projects:', error);
    });
    
    projectsReq.end();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testJsonResponse();
