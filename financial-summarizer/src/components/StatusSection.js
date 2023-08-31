import React from 'react';

function StatusSection({ status }) {
    return (
        <section id="statusSection">
            {status && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(status).map(([pdf_url, details]) => (
                        <div key={pdf_url} className="bg-white p-4 rounded shadow" data-pdf-url={pdf_url}>
                            <h2 className="text-xl mb-2 truncate">{pdf_url}</h2>
                            <p><strong>Type:</strong> {details.document_type}</p>
                            <p><strong>Step:</strong> {details.step}</p>
                            <div className="mt-4">
                                {details.analysis ? (
                                    <button className="bg-green-500 text-white px-4 py-2 rounded">Analysis Complete</button>
                                ) : (
                                    <button className="bg-blue-500 text-white px-4 py-2 rounded">Start Analysis</button>
                                )}
                            </div>
                            <div className="mt-4">
                                <progress value="50" max="100" className="w-full"></progress>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default StatusSection;
