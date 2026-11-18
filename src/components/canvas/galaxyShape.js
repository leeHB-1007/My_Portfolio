// 은하 팔 공식(angle = arm/ARMS·2π + radius·SPIN)의 상수. 항해 별 배치(eager)도 쓰므로
// 입자 생성 코드와 분리해 entry에 입자 생성 코드가 끌려오지 않게 한다.
export const GALAXY_ARMS = 4;
export const SPIN = 1.1;
