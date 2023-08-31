import React from 'react';

function AnalysisCards({ data }) {
    return (
        <div id="analysisCards">
            {Object.entries(data).map(([pdfUrl, details]) => (
                <div key={pdfUrl} className="bg-white p-4 rounded shadow mt-4">
                    <h2 className="text-xl mb-2 truncate">{pdfUrl}</h2>
                    <p><strong>Type:</strong> {details.document_type}</p>
                    <p><strong>Step:</strong> {details.step}</p>
                    <div className="mt-4">
                        {details.analysis ? (
                            <button className="bg-green-500 text-white px-4 py-2 rounded">Analysis Complete</button>
                        ) : details.step === "Identification Completed" ? (
                            <button className="bg-blue-500 text-white px-4 py-2 rounded">Start Analysis</button>
                        ) : null}
                    </div>
                    <div className="mt-4">
                        <progress value="50" max="100" className="w-full"></progress>
                    </div>
                    <div className="mt-4">
    <strong>Analysis:</strong>
    <ul>
        {Array.isArray(details.analysis) && details.analysis.map((item, idx) => (
            <li key={idx}>
                {item.main}
                {item.sub && item.sub.length > 0 && (
                    <ul>
                        {item.sub.map((subItem, subIdx) => (
                            <li key={subIdx}>{subItem}</li>
                        ))}
                    </ul>
                )}
            </li>
        ))}
    </ul>
</div>
                </div>
            ))}
        </div>
    );
}

export default AnalysisCards;
