import { toast } from "@UI/react/store/toastStore.js";

export function FileUploadPrompt() {
    const [missingFiles, setMissingFiles] = useState([])

    useEffect(() => {
        const handler = (event) => {
            const { datasetId, filename, hash } = event.detail
            setMissingFiles(prev => [...prev, { datasetId, filename, hash }])
        }

        window.addEventListener("file-upload-needed", handler)
        return () => window.removeEventListener("file-upload-needed", handler)
    }, [])

    const handleFileUpload = async (datasetId, file) => {
        // Verify hash matches
        const hash = await computeHash(file)
        const missing = missingFiles.find(f => f.datasetId === datasetId)

        if (hash !== missing.hash) {
            toast.info("File hash mismatch! This is not the correct file.")
            return
        }

        // Store in cache
        await dataCache.storeDataset(file)

        // Load polydata
        await datasetManager.loadPolydataFromCache(datasetId)

        // Remove from missing files list
        setMissingFiles(prev => prev.filter(f => f.datasetId !== datasetId))
    }

    const handleCancel = (datasetId) => {
        // Keep in list but show warning
        // Don't remove - allow retry later
    }

    if (missingFiles.length === 0) return null

    return (
        <div className="file-upload-prompt">
            <h3>Missing Files</h3>
            {missingFiles.map(file => (
                <div key={file.datasetId} className="missing-file">
                    <div className="file-info">
                        <span className="icon">⚠️</span>
                        <span className="filename">{file.filename}</span>
                        <span className="status">Not in your cache</span>
                    </div>
                    <div className="actions">
                        <input
                            type="file"
                            onChange={(e) => handleFileUpload(file.datasetId, e.target.files[0])}
                            accept=".vtp"
                        />
                        <button onClick={() => handleCancel(file.datasetId)}>
                            Cancel
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}