using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MesaApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTableSeatSizeColumnadd : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TableSize",
                table: "RestaurantTables",
                newName: "TableSeatSize");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "TableSeatSize",
                table: "RestaurantTables",
                newName: "TableSize");
        }
    }
}
