interface PieChartProps {
    data: Record<string, number>;
    total: number;
}

export default function PieChart({ data, total }: PieChartProps) {
    const colors = ['#4F5ED1', '#7ED8C7', '#FF9B5E', '#E8B134', '#FF6F91', '#39A5D8', '#E3DB4D'];

    const entries = Object.entries(data);
    let cumulativeAngle = 0;

    return (
        <div className='flex flex-col items-center gap-6'>
            {/* Pie Chart */}
            <svg width='300' height='300' viewBox='0 0 100 100' className='transform -rotate-90'>
                <circle cx='50' cy='50' r='50' fill='#1e2939' />
                {entries.map(([name, count], index) => {
                    const percentage = (count / total) * 100;
                    const angle = (percentage / 100) * 360;
                    const startAngle = cumulativeAngle;
                    const endAngle = cumulativeAngle + angle;

                    const startX = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
                    const startY = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
                    const endX = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
                    const endY = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);

                    const largeArcFlag = angle > 180 ? 1 : 0;

                    const pathData = `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                    cumulativeAngle += angle;

                    return <path key={name} d={pathData} fill={colors[index % colors.length]} />;
                })}
            </svg>

            {/* Legend */}
            <div className='grid grid-cols-2 gap-4'>
                {entries.map(([name, count], index) => {
                    const percentage = ((count / total) * 100).toFixed(1);
                    return (
                        <div key={name} className='flex items-center gap-2'>
                            <div
                                className='h-4 w-4 rounded'
                                style={{ backgroundColor: colors[index % colors.length] }}
                            ></div>
                            <span className='text-white'>
                                {name}: {count} ({percentage}%)
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
