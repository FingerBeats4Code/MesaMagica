namespace MesaApi.Services
{
    public interface IQRCodeService
    {
        Task<string> StartSessionAsync(string qrCodeUrl);
    }

}
