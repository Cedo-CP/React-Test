import React, { useState } from 'react';
import './App.css';
import AnalysisCards from './components/AnalysisCards'; // Note: This import remains unused in the provided code
import SummaryCard from './components/SummaryCard';

function App() {
    const [pdfUrls, setPdfUrls] = useState('');
    const [status, setStatus] = useState({});
    const [summarizedResponses, setSummarizedResponses] = useState({});
    const [currentDocument, setCurrentDocument] = useState(null);
    const [loading, setLoading] = useState(false);
    const FLASK_SERVER_URL = 'http://127.0.0.1:5000';

    const handleIdentifyDocuments = async (event) => {
    event.preventDefault();
    setLoading(true);

    // Replace commas with an empty string
    const sanitizedUrls = pdfUrls.replace(/,/g, '');

    const urlsArray = sanitizedUrls.trim().split('\n');

    for (let pdfUrl of urlsArray) {
        try {
            const response = await fetch(`${FLASK_SERVER_URL}/identify-documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    pdf_url: pdfUrl,
                }),
            });

            let data;
            try {
                data = await response.json();
            } catch (err) {
                console.error("Received non-JSON response from backend for URL:", pdfUrl);
                continue; // skip to the next iteration
            }

            if (response.ok) {
                for (const [responseUrl, result] of Object.entries(data)) {
                    if (result.document_type) {
                        const content = result.document_type;
                        setStatus(prevStatus => ({
                            ...prevStatus,
                            [responseUrl]: {
                                content: content,
                                step: result.step || "Identification Completed",
                                optimizedText: result.optimized_text || null,
                            }
                        }));
                        setCurrentDocument(responseUrl);
                    } else {
                        console.error("Unexpected structure for URL:", responseUrl, "Result:", result);
                    }
                }
            } else {
                console.error("Backend error during identification or unexpected response structure for URL:", pdfUrl, "Full response:", data);
            }
        } catch (error) {
            console.error("Error identifying document:", error);
        }
    }
    setLoading(false);
};

    const handleStartAnalysis = async (pdfUrl) => {
        setLoading(true);
    
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
    
        if (data.success && data['combined_response']) {
            setStatus(prevStatus => {
                const updatedStatus = { ...prevStatus };
                updatedStatus[pdfUrl] = {
                    ...updatedStatus[pdfUrl],
                    step: "Analysis Completed",
                    analysis: data['combined_response'].split("\n") // Splitting by new line if there are multiple lines
                };
                return updatedStatus;
            });
        } else {
            console.error("Error starting analysis:", data.error || "Unknown error");
        }
        setLoading(false);
    };    

    const handleSummarizeResponses = async () => {
        try {
            setLoading(true);
            
            // Structure the data to include both the identified document type and combined response
            const combinedDataToSend = Object.entries(status).map(([pdfUrl, details]) => ({
                document_type: details.content, // 'content' here seems to store the identified document type
                combined_response: details.analysis.join("\n") // Assuming 'analysis' is an array of strings
            }));
    
            const response = await fetch(`${FLASK_SERVER_URL}/summarize-all-responses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ combinedData: combinedDataToSend }),
            });
        
            const data = await response.json();
            setSummarizedResponses(data);
        } catch (error) {
            console.error("Error summarizing responses:", error);
        } finally {
            setLoading(false);
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
            {loading && <div>Loading...</div>}
            <section id="analysisCards">
                {Object.entries(status).map(([pdfUrl, details]) => (
                    <div key={pdfUrl} className="bg-white p-4 rounded shadow mt-4">
                        <h2 className="text-xl mb-2 truncate">{pdfUrl}</h2>
                        <p><strong>Type:</strong> {details.content}</p>
                        <p><strong>Step:</strong> {details.step}</p>
                        <div className="mt-4">
                            {details.analysis ? (
                                <button className="bg-green-500 text-white px-4 py-2 rounded">Analysis Complete</button>
                            ) : details.step === "Identification Completed" ? (
                                <button onClick={() => handleStartAnalysis(pdfUrl)} className="bg-blue-500 text-white px-4 py-2 rounded">Start Analysis</button>
                            ) : null}
                        </div>
                        <div className="mt-4">
                            <progress value={details.analysis ? 100 : 50} max="100" className="w-full"></progress>
                        </div>
                        <div className="mt-4">
                            <strong>Analysis:</strong>
                            <ul>
                                {Array.isArray(details.analysis) && details.analysis.map((line, idx) => (
                                    <li key={idx}>{line}</li>
                                ))}
                            </ul>
                        </div>
                        {summarizedResponses[pdfUrl] && (
                            <div className="mt-4 bg-gray-100 p-2 rounded">
                                <strong>Summary:</strong>
                                <p>{summarizedResponses[pdfUrl]}</p>
                            </div>
                        )}
                    </div>
                ))}
            </section>
            <section>
                {Object.keys(summarizedResponses).length > 0 && (
                    <SummaryCard summaries={summarizedResponses} />
                )}
            </section>
        </div>
    );
}

export default App;
