import "./Dashboard.css";
import Header from "../components/Header";
import SidebarLayout from "../components/SidebarLayout";
import { dashboardData } from "../data/dashboardData";

function Dashboard({ engine }) {
  const data = dashboardData.default;

  return (
    <SidebarLayout>
      <Header engine={engine} />
      <div className="dashboard">
        {/* Welcome */}
        <section className="dashboard-welcome">
          <div>
            <h1>
              {data.greeting}, <span>{data.businessName} ✦</span>
            </h1>

            <p>{data.subtitle}</p>
          </div>

          <div className="dashboard-search">
            <input type="text" placeholder="Search anything..." />

            <span>⌕</span>
          </div>
        </section>

        {/* Statistics */}
        <section className="stats-grid">
          {data.stats.map((stat, index) => (
            <div className="stat-card" key={index}>
              <div className="stat-icon">{["$", "↗", "♙", "◇"][index]}</div>

              <div>
                <p>{stat.title}</p>

                <h2>{stat.value}</h2>

                <small>
                  ↑ {stat.change} <span>from last month</span>
                </small>
              </div>
            </div>
          ))}
        </section>

        {/* Hero */}
        <section className="dashboard-hero">
          <div className="hero-content">
            <p>{data.hero.smallTitle}</p>

            <h2>{data.hero.title}</h2>

            <span>{data.hero.description}</span>

            <button>
              {data.hero.button}
              <b>→</b>
            </button>
          </div>
        </section>

        {/* Main panels */}
        <section className="dashboard-grid">
          {/* Recent Activity */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <h3>{data.activityTitle}</h3>

              <button>View All</button>
            </div>

            {data.activities.map((activity, index) => (
              <div className="activity" key={index}>
                <div className="activity-icon">✦</div>

                <div className="activity-info">
                  <strong>{activity.title}</strong>

                  <span>{activity.description}</span>
                </div>

                <small>{activity.time}</small>
              </div>
            ))}
          </div>

          {/* Sales Overview */}
          <div className="dashboard-panel sales-panel">
            <div className="panel-header">
              <h3>Business Overview</h3>

              <select defaultValue="month">
                <option value="month">This Month</option>

                <option value="last">Last Month</option>

                <option value="year">This Year</option>
              </select>
            </div>

            <div className="sales-number">{data.stats[0].value}</div>

            <p className="sales-growth">
              ↑ {data.stats[0].change} from last month
            </p>

            <div className="chart">
              <div className="chart-line">
                {[30, 45, 36, 65, 50, 42, 60, 76, 55, 70, 84].map(
                  (height, index) => (
                    <span
                      key={index}
                      style={{
                        left: `${index * 9 + 3}%`,
                        bottom: `${height}%`,
                      }}
                    />
                  ),
                )}
              </div>

              <div className="chart-labels">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
          </div>

          {/* Top Performing */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <h3>{data.topTitle}</h3>

              <button>View All</button>
            </div>

            {data.topItems.map((item, index) => (
              <div className="top-product" key={index}>
                <div className="product-image">{index + 1}</div>

                <div>
                  <strong>{item.name}</strong>

                  <span>{item.sold} sold</span>
                </div>

                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          {data.quickActions.map((action, index) => (
            <div className="quick-action" key={index}>
              <div className="quick-icon">{action.icon}</div>

              <section>
                <strong>{action.title}</strong>

                <span>{action.description}</span>
              </section>
            </div>
          ))}
        </section>
      </div>
    </SidebarLayout>
  );
}

export default Dashboard;
