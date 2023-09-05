// components/SummaryCard.js
import React from 'react';

function SummaryCard({ summaries }) {
    return (
        <div className="bg-white p-4 rounded shadow mt-4">
            <h2 className="text-xl mb-2">Summary</h2>
            {Object.entries(summaries).map(([documentType, summaryText]) => (
                <div key={documentType}>
                    <strong>{documentType}:</strong>
                    <p>{summaryText}</p>
                </div>
            ))}
        </div>
    );
}

export default SummaryCard;
