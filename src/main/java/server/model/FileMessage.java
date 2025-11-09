package server.model;

public class FileMessage extends Message {
    private static final long serialVersionUID = 1L;
    private String filename;
    private byte[] fileData;

    public FileMessage(String fromUsername, String filename, byte[] fileData){
        super(fromUsername);
        this.filename = filename;
        this.fileData = fileData;
    }
    public String getFilename(){ return filename; }
    public byte[] getFileData(){ return fileData; }
}