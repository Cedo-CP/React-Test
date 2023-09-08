import React, { useState, useEffect } from 'react';
import './App.css';
import AnalysisCards from './components/AnalysisCards';
import SummaryCard from './components/SummaryCard';


function App() {
    const [pdfUrls, setPdfUrls] = useState('');
    const [status, setStatus] = useState({});
    const [summarizedResponses, setSummarizedResponses] = useState({});
    const FLASK_SERVER_URL = 'literate-journey-r5v477rjr9q2rj7-5000.app.github.dev';

    const handleIdentifyDocuments = async (event) => {
        event.preventDefault();

        try {
            const response = await fetch(`${FLASK_SERVER_URL}/identify-documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    pdf_urls: pdfUrls,
                }),
            });

            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error("Error identifying documents:", error);
        }
    };

    const handleStartAnalysis = async (pdfUrl) => {
        try {
            const response = await fetch(`${FLASK_SERVER_URL}/start-analysis-for-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    pdf_url: pdfUrl,
                }),
            });
    
            const data = await response.json();
            if (data.success) {
                setStatus(prevStatus => {
                    const updatedStatus = { ...prevStatus };
                    updatedStatus[pdfUrl] = {
                        ...updatedStatus[pdfUrl],
                        analysis: data.analysis.split('\n'),  // Split the raw response by lines
                        step: "Analysis Completed"
                    };
                    return updatedStatus;
                });
            } else {
                console.error("Error starting analysis:", data.error);
            }
        } catch (error) {
            console.error("Error starting analysis:", error);
        }
        
        // Log the updated status to see if the component is re-rendering
        console.log(status);
    };    

    const handleSummarizeResponses = async () => {
        try {
            const response = await fetch(`${FLASK_SERVER_URL}/summarize-all-responses`, {
                method: 'GET',
            });
    
            const data = await response.json();
            setSummarizedResponses(data);
    
        } catch (error) {
            console.error("Error summarizing responses:", error);
        }
    };    

    const allAnalysisCompleted = Object.values(status).every(details => details.step === "Analysis Completed");

    return (
        <div className="container mx-auto p-4">
            <header className="text-center mb-12">
                <img src="https://otso.io/wp-content/uploads/2022/01/Logo-Otso.png" alt="Otso Logo" className="mx-auto mb-6 w-32 h-auto" />
                <h1 className="text-2xl font-bold">PDF Analyzer</h1>
            </header>

            <section>
                <form onSubmit={handleIdentifyDocuments} className="mb-12">
                    <div className="mb-4">
                        <label htmlFor="pdf_urls" className="block text-sm font-bold mb-2">PDF URLs:</label>
                        <textarea 
                            id="pdf_urls" 
                            name="pdf_urls" 
                            rows="5" 
                            className="w-full px-3 py-2 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                            value={pdfUrls}
                            onChange={e => setPdfUrls(e.target.value)}
                        ></textarea>
                    </div>
                    <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                        Identify Documents
                    </button>
                    {allAnalysisCompleted && (
                        <button 
                            type="button"
                            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
                            onClick={handleSummarizeResponses}
                        >
                            Summarize Responses
                        </button>
                    )}
                </form>
            </section>

            <section id="analysisCards">
                {Object.entries(status).map(([pdfUrl, details]) => (
                    <div key={pdfUrl} className="bg-white p-4 rounded shadow mt-4">
                        <h2 className="text-xl mb-2 truncate">{pdfUrl}</h2>
                        <p><strong>Type:</strong> {details.document_type}</p>
                        <p><strong>Step:</strong> {details.step}</p>
                        <div className="mt-4">
                            {details.analysis ? (
                                <button className="bg-green-500 text-white px-4 py-2 rounded">Analysis Complete</button>
                            ) : details.step === "Identification Completed" ? (
                                <button onClick={() => handleStartAnalysis(pdfUrl)} className="bg-blue-500 text-white px-4 py-2 rounded">Start Analysis</button>
                            ) : null}
                        </div>
                        <div className="mt-4">
                            <progress value="50" max="100" className="w-full"></progress>
                        </div>
                        <div className="mt-4">
                            <strong>Analysis:</strong>
                            <ul>
                                {Array.isArray(details.analysis) && details.analysis.map((line, idx) => (
                                    <li key={idx}>{line}</li>
                                ))}
                            </ul>
                        </div>

                        {/* New section inside the card to display summarized data */}
                        {summarizedResponses[pdfUrl] && (
                            <div className="mt-4 bg-gray-100 p-2 rounded">
                                <strong>Summary:</strong>
                                <p>{summarizedResponses[pdfUrl]}</p>
                            </div>
                        )}
                    </div>
                ))}
            </section>

            {/* New Section for SummaryCard */}
            <section>
                {Object.keys(summarizedResponses).length > 0 && (
                    <SummaryCard summaries={summarizedResponses} />
                )}
            </section>

        </div>
    );
}

export default App;