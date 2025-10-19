namespace MesaApi.Common
{
    //------------------changes for removing magic strings----------------------
    public static class Roles
    {
        public const string Admin = "Admin";
        public const string Staff = "Staff";
    }

    public static class OrderStatus
    {
        public const string Pending = "Pending";
        public const string Preparing = "Preparing";
        public const string Served = "Served";
        public const string Closed = "Closed";
    }

    public static class JwtClaims
    {
        public const string TenantKey = "tenantKey";
        public const string TenantSlug = "tenantSlug";
        public const string SessionId = "sessionId";
        public const string TableId = "tableId";
    }
    //------------------end changes----------------------
}