import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;
import java.sql.*;

public class RegisterServlet extends HttpServlet {
  protected void doPost(HttpServletRequest req, HttpServletResponse res)
      throws ServletException, IOException {

    String username = req.getParameter("username");
    String latitude = req.getParameter("latitude");
    String longitude = req.getParameter("longitude");

    try {
      Class.forName("com.mysql.jdbc.Driver");
      Connection conn = DriverManager.getConnection(
          "jdbc:mysql://localhost:3306/smartwaste", "root", "yourpassword");

      PreparedStatement stmt = conn.prepareStatement(
          "INSERT INTO users (username, latitude, longitude) VALUES (?, ?, ?)");
      stmt.setString(1, username);
      stmt.setString(2, latitude);
      stmt.setString(3, longitude);

      stmt.executeUpdate();

      res.setContentType("text/plain");
      res.getWriter().write("Success");
    } catch (Exception e) {
      e.printStackTrace();
      res.getWriter().write("Database Error");
    }
  }
}
