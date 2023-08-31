export function Form({ pdfUrls, setPdfUrls, handleIdentifyDocuments }) {
    return (
        <section>
            <form onSubmit={handleIdentifyDocuments}>
                <div className="mb-4">
                    <label htmlFor="pdf_urls" className="block text-sm font-bold mb-2">PDF URLs:</label>
                    <textarea
                        id="pdf_urls"
                        value={pdfUrls}
                        onChange={(e) => setPdfUrls(e.target.value)}
                        rows="5"
                        className="w-full px-3 py-2 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                    ></textarea>
                </div>
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                    Identify Documents
                </button>
            </form>
        </section>
    );
}
