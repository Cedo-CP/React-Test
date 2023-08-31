import React from 'react';

function DocumentCard({ identificationResponse, combinedResponse }) {
    return (
        <div className="document-card">
            <h2 className="document-title">Document Identification</h2>
            <p className="document-content">{identificationResponse.choices[0].message.content}</p>

            <h2 className="document-title">Document Details</h2>
            <div className="document-detail">
                <i className="icon-bank"></i>
                <p className="document-content">Bank Name: {combinedResponse['Bank Name']}</p>
            </div>
            <div className="document-detail">
                <i className="icon-user"></i>
                <p className="document-content">Account Name: {combinedResponse['Account Name']}</p>
            </div>
            <div className="document-detail">
                <i className="icon-calendar"></i>
                <p className="document-content">Month of Statement: {combinedResponse['Month of the Statement']}</p>
            </div>
            <div className="document-detail">
                <i className="icon-wallet"></i>
                <p className="document-content">Ending Balance: {combinedResponse['Ending Balance']}</p>
            </div>
        </div>
    );
}

export default DocumentCard;
