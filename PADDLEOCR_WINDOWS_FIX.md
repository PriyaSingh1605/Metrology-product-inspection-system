# PaddleOCR Windows CPU fix

The AI service disables oneDNN/MKL-DNN for PaddleOCR CPU inference because some PaddlePaddle 3.x + PaddleOCR 3.x Windows combinations raise `ConvertPirAttribute2RuntimeAttribute not support pir::ArrayAttribute<DoubleAttribute>`.

The service initializes PaddleOCR with `enable_mkldnn=False`, `device="cpu"`, and disables document-orientation/unwarping/textline-orientation extras for the package-label OCR path.

After replacing the project, restart the AI service. No frontend/backend changes are required for this fix.
