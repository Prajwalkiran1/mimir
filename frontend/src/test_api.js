/**
 * Frontend API Testing Script
 * Tests frontend-backend communication
 */

import { apiService } from './services/api.js';

class FrontendTester {
    constructor() {
        this.testResults = [];
        this.testFile = null;
    }

    log(test, success, message) {
        const status = success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test}: ${message}`);
        this.testResults.push({ test, success, message });
    }

    async createTestFile() {
        // Create a small test video file blob
        const content = new Uint8Array([0x00, 0x00, 0x00, 0x20]); // Small MP4 header
        this.testFile = new File([content], 'test_video.mp4', { type: 'video/mp4' });
    }

    async testApiConnection() {
        console.log('\n🔗 Testing API Connection...');
        try {
            const response = await apiService.healthCheck();
            this.log('API Connection', true, `Status: ${response.status}`);
            return true;
        } catch (error) {
            this.log('API Connection', false, error.message);
            return false;
        }
    }

    async testVideoUpload() {
        console.log('\n📹 Testing Video Upload...');
        try {
            if (!this.testFile) {
                await this.createTestFile();
            }

            const options = {
                transcript: true,
                summary: true,
                subtitles: true,
                keyframes: false,
                topic_based: false,
                download_format: 'srt',
                use_gpu: false
            };

            const response = await apiService.uploadVideo(this.testFile, options);
            this.log('Video Upload', true, `Task ID: ${response.task_id}`);
            
            // Test status polling
            await this.testStatusPolling(response.task_id);
            return response.task_id;
        } catch (error) {
            this.log('Video Upload', false, error.message);
            return null;
        }
    }

    async testStatusPolling(taskId) {
        console.log('\n📋 Testing Status Polling...');
        try {
            let attempts = 0;
            const maxAttempts = 10;

            const pollStatus = async () => {
                const status = await apiService.getStatus(taskId);
                console.log(`   Status: ${status.status} (${status.progress}%) - ${status.current_step}`);
                
                if (status.status === 'completed') {
                    this.log('Status Polling', true, 'Task completed successfully');
                    await this.testResultsRetrieval(taskId);
                    return true;
                } else if (status.status === 'failed') {
                    this.log('Status Polling', false, status.error || 'Task failed');
                    return false;
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(pollStatus, 2000);
                } else {
                    this.log('Status Polling', false, 'Polling timeout');
                    return false;
                }
            };

            await pollStatus();
            return true;
        } catch (error) {
            this.log('Status Polling', false, error.message);
            return false;
        }
    }

    async testResultsRetrieval(taskId) {
        console.log('\n📄 Testing Results Retrieval...');
        try {
            const results = await apiService.getResults(taskId);
            const hasResults = results.transcript || results.summary || results.subtitles || results.keyframes;
            
            this.log('Results Retrieval', hasResults, 
                `Transcript: ${!!results.transcript}, Summary: ${!!results.summary}, Subtitles: ${!!results.subtitles}`);
            return true;
        } catch (error) {
            this.log('Results Retrieval', false, error.message);
            return false;
        }
    }

    async testErrorHandling() {
        console.log('\n⚠️ Testing Error Handling...');
        try {
            // Test invalid task ID
            await apiService.getStatus('invalid-task-id');
            this.log('Error Handling', false, 'Should have failed for invalid task ID');
            return false;
        } catch (error) {
            this.log('Error Handling', true, 'Correctly handled invalid task ID');
            return true;
        }
    }

    async runAllTests() {
        console.log('='.repeat(60));
        console.log('🧪 Frontend API Integration Tests');
        console.log('='.repeat(60));

        // Create test file
        await this.createTestFile();

        // Run tests
        await this.testApiConnection();
        const taskId = await this.testVideoUpload();
        await this.testErrorHandling();

        // Print summary
        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 Frontend Test Summary');
        console.log('='.repeat(60));

        const passed = this.testResults.filter(r => r.success).length;
        const total = this.testResults.length;

        this.testResults.forEach(({ test, success, message }) => {
            const status = success ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${test}: ${message}`);
        });

        console.log(`\n🎯 Results: ${passed}/${total} tests passed`);

        if (passed === total) {
            console.log('🎉 All frontend tests passed!');
        } else {
            console.log('⚠️ Some frontend tests failed.');
        }
    }
}

// Export for use in browser console
window.FrontendTester = FrontendTester;

// Auto-run if in development mode
if (import.meta.env.DEV) {
    console.log('🧪 Frontend tests available. Run: new FrontendTester().runAllTests()');
}
