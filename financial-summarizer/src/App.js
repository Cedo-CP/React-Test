import React, { useState } from 'react';
import './App.css';
import AnalysisCards from './components/AnalysisCards'; 
import SummaryCard from './components/SummaryCard';

function App() {
    const [pdfUrls, setPdfUrls] = useState('');
    const [status, setStatus] = useState({});
    const [summarizedResponses, setSummarizedResponses] = useState({});
    const [currentDocument, setCurrentDocument] = useState(null);
    const [loading, setLoading] = useState(false);
    const [documentList, setDocumentList] = useState([]);
    const [selectedDocuments, setSelectedDocuments] = useState([]);
    const FLASK_SERVER_URL = 'http://127.0.0.1:5000';

    const sanitizeUrl = (url) => {
        const sanitizedUrl = url.replace('//', '');  // remove '//' from the URL
        return sanitizedUrl;
    };

    const handleIdentifyDocuments = async (event) => {
        event.preventDefault();
        setLoading(true);
        const urlsArray = pdfUrls.trim().split(/\s*,\s*/);
        setDocumentList(urlsArray);
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
                let data = await response.json();
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
                    console.error("Backend error during identification for URL:", pdfUrl, "Full response:", data);
                }
            } catch (error) {
                console.error("Error identifying document:", error);
            }
        }
        setLoading(false);
    };    

    const handleStartAnalysis = async (pdfUrl) => {
        setLoading(true);
        const sanitizedUrl = sanitizeUrl(pdfUrl); // Sanitize the URL before sending it
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
                    analysis: data['combined_response'].split("\n")
                };
                return updatedStatus;
            });
        } else {
            console.error("Error starting analysis:", data.error || "Unknown error");
        }
        setLoading(false);
    };

    const handleSummarizeResponses = async () => {
        setLoading(true);
        
        // Filter out only the selected documents for summarization
        const combinedDataToSend = Object.entries(status)
            .filter(([pdfUrl]) => selectedDocuments.includes(pdfUrl))
            .map(([pdfUrl, details]) => ({
                document_type: details.content,
                combined_response: details.analysis.join("\n")
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
        setLoading(false);
    };   

    const toggleDocumentSelection = (pdfUrl) => {
        if (selectedDocuments.includes(pdfUrl)) {
            setSelectedDocuments(prevSelected => prevSelected.filter(url => url !== pdfUrl));
        } else {
            setSelectedDocuments(prevSelected => [...prevSelected, pdfUrl]);
        }
    };

    const handleAnalyzeAll = async () => {
        for (const pdfUrl of documentList) {
            const correctedUrl = ensureFullURLScheme(pdfUrl);
            await handleStartAnalysis(correctedUrl);
        }
    };
    
    const ensureFullURLScheme = (url) => {
        if (url.startsWith("//")) {
            return "https:" + url;
        }
        return url;
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
                    <button 
                        type="button"
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
                        onClick={handleAnalyzeAll}
                    >
                        Analyze All
                    </button>
                </form>
            </section>
            {loading && (
                <div className="text-center py-4">
                    <p>Loading...</p>
                </div>
            )}
             <section id="analysisCards">
        {Object.entries(status).map(([pdfUrl, details]) => (
            <div key={pdfUrl} className="bg-white p-4 rounded shadow mt-4">
                <h2 className="text-lg font-bold mb-2">{pdfUrl}</h2>
                <div className="flex items-center">
                    <input 
                        type="checkbox"
                        className="mr-2"
                        checked={selectedDocuments.includes(pdfUrl)}
                        onChange={() => toggleDocumentSelection(pdfUrl)}
                    />
                    <p>{details.content}</p>
                </div>
                <div className="mt-4">
                    {details.analysis ? (
                        <div className="flex items-center">
                            <button className="bg-green-500 text-white px-4 py-2 rounded mr-2">Analysis Complete</button>
                            <button onClick={() => handleStartAnalysis(pdfUrl)} className="bg-orange-500 text-white px-4 py-2 rounded">Re-run Analysis</button>
                            <ul>
                                {details.analysis.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ) : details.step === "Identification Completed" ? (
                        <button onClick={() => handleStartAnalysis(pdfUrl)} className="bg-blue-500 text-white px-4 py-2 rounded">Start Analysis</button>
                    ) : null}
                </div>
            </div>
        ))}
    </section>
            <section id="summaryCard">
            {summarizedResponses && Object.keys(summarizedResponses).length > 0 && (
                <SummaryCard summaries={summarizedResponses} />
            )}
        </section>
        </div>
    );
}

export default App;
