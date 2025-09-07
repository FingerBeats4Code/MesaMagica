using Microsoft.EntityFrameworkCore.Migrations;

namespace MesaApi.Migrations
{
    public partial class AddUserColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Users",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LockedUntil",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FailedLoginAttempts",
                table: "Users",
                nullable: false,
                defaultValue: 0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "UpdatedAt", table: "Users");
            migrationBuilder.DropColumn(name: "UpdatedBy", table: "Users");
            migrationBuilder.DropColumn(name: "LockedUntil", table: "Users");
            migrationBuilder.DropColumn(name: "FailedLoginAttempts", table: "Users");
        }
    }
}